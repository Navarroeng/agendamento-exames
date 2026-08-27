import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  MENSAGEM_VALIDACAO_GENERICA,
  createAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import { registrarAuditoriaPortal } from "@/lib/avaliacao-auditoria";
import {
  checkAvaliacaoRateLimit,
  getClientIpFromRequest,
} from "@/lib/avaliacao-rate-limit";
import {
  MENSAGEM_JA_RESPONDIDA_CORPO,
  mensagemPorCodigoErro,
} from "@/lib/avaliacao-constantes";
import { parseDataNascimentoBr } from "@/lib/date-br";
import { normalizeCpfDigits, isValidCPF } from "@/lib/cpf";
import { buildCopsoqFlow } from "@/lib/copsoq";
import {
  calcularFlowIndexRetomada,
  buscarSessaoExistente,
  listarRespostasDaSessao,
  mapRespostasParaEstadoLocal,
} from "@/lib/avaliacao-persistencia";
import { classificarSituacaoParticipante } from "@/lib/avaliacao-retomada";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  codigoErroPublico,
  validarAcessoAvaliacao,
} from "@/lib/avaliacao-validacao";

export const runtime = "nodejs";

const CAMPANHA_SELECT =
  "id, codigo_publico, cliente_id, cnpj, empresa_nome, status, data_inicio, data_encerramento";

const PARTICIPANTE_SELECT =
  "id, campanha_id, cpf, data_nascimento, nome_completo, status, concluiu_em, acessou_em, removido_em";

export async function POST(request: Request) {
  try {
    const ip = getClientIpFromRequest(request);
    const body = (await request.json()) as {
      codigoPublico?: string;
      cpf?: string;
      dataNascimento?: string;
    };

    const codigoPublico = String(body.codigoPublico ?? "")
      .trim()
      .toUpperCase();
    const cpfDigits = normalizeCpfDigits(body.cpf);
    const dataNascimentoIso = parseDataNascimentoBr(body.dataNascimento);

    const rateKey = `avaliacao:${ip}:${codigoPublico || "none"}`;
    const rate = checkAvaliacaoRateLimit(rateKey);
    if (!rate.allowed) {
      console.info("[avaliacao/validar] motivo=rate_limit", {
        codigoPublico: codigoPublico || null,
      });
      return NextResponse.json(
        {
          ok: false,
          codigo: "nao_apto",
          error: MENSAGEM_VALIDACAO_GENERICA,
        },
        {
          status: 429,
          headers: rate.retryAfterSec
            ? { "Retry-After": String(rate.retryAfterSec) }
            : undefined,
        }
      );
    }

    if (!codigoPublico || !isValidCPF(cpfDigits) || !dataNascimentoIso) {
      console.info("[avaliacao/validar] motivo=entrada_invalida", {
        codigoPublico: codigoPublico || null,
        cpfLen: cpfDigits.length,
        cpfValido: isValidCPF(cpfDigits),
        nascimentoParseOk: Boolean(dataNascimentoIso),
      });
      return NextResponse.json(
        {
          ok: false,
          codigo: "nao_apto",
          error: MENSAGEM_VALIDACAO_GENERICA,
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: campanha, error: campanhaError } = await supabase
      .from("riscos_campanhas")
      .select(CAMPANHA_SELECT)
      .eq("codigo_publico", codigoPublico)
      .maybeSingle();

    if (campanhaError) throw campanhaError;

    let participante = null;
    if (campanha?.id) {
      // Isolamento: sempre campanha_id + CPF (nunca CPF sozinho).
      // Exclui soft-deleted quando a coluna existir.
      let { data, error } = await supabase
        .from("riscos_campanha_participantes")
        .select(PARTICIPANTE_SELECT)
        .eq("campanha_id", campanha.id)
        .eq("cpf", cpfDigits)
        .is("removido_em", null)
        .maybeSingle();

      if (error && /removido_em/i.test(error.message ?? "")) {
        const fb = await supabase
          .from("riscos_campanha_participantes")
          .select(
            "id, campanha_id, cpf, data_nascimento, nome_completo, status, concluiu_em, acessou_em"
          )
          .eq("campanha_id", campanha.id)
          .eq("cpf", cpfDigits)
          .maybeSingle();
        data = fb.data as typeof data;
        error = fb.error;
      }
      if (error) throw error;
      participante = data;
    }

    const resultado = validarAcessoAvaliacao({
      codigoPublicoUrl: codigoPublico,
      dataNascimentoIso,
      campanha: campanha
        ? {
            id: String(campanha.id),
            codigo_publico: String(campanha.codigo_publico),
            cliente_id: campanha.cliente_id
              ? String(campanha.cliente_id)
              : null,
            cnpj: String(campanha.cnpj ?? ""),
            empresa_nome: String(campanha.empresa_nome ?? ""),
            status: String(campanha.status ?? ""),
            data_inicio: String(campanha.data_inicio ?? ""),
            data_encerramento: String(campanha.data_encerramento ?? ""),
          }
        : null,
      participante: participante
        ? {
            id: String(participante.id),
            campanha_id: String(participante.campanha_id),
            cpf: String(participante.cpf),
            data_nascimento: participante.data_nascimento
              ? String(participante.data_nascimento).slice(0, 10)
              : null,
            nome_completo: String(participante.nome_completo ?? ""),
            status: String(participante.status ?? ""),
            concluiu_em: participante.concluiu_em
              ? String(participante.concluiu_em)
              : null,
            removido_em: participante.removido_em
              ? String(participante.removido_em)
              : null,
          }
        : null,
    });

    if (!resultado.ok) {
      const codigo = codigoErroPublico(resultado.motivo);
      console.info("[avaliacao/validar] motivo=" + resultado.motivo, {
        codigoPublico,
        codigoPublicoErro: codigo,
        participanteEncontrado: Boolean(participante),
        participanteStatus: participante?.status ?? null,
        temConcluiuEm: Boolean(participante?.concluiu_em),
      });

      if (
        (resultado.motivo === "campanha_encerrada" ||
          resultado.motivo === "prazo_encerrado") &&
        campanha?.id
      ) {
        await registrarAuditoriaPortal(supabase, {
          evento: "tentativa_apos_encerramento",
          campanhaId: String(campanha.id),
          participanteId: participante?.id
            ? String(participante.id)
            : null,
          codigoPublico,
          ip,
          detalhes: { origem: "validar" },
        });
      }

      if (
        resultado.motivo === "participante_ja_concluiu" &&
        campanha?.id &&
        participante?.id
      ) {
        await registrarAuditoriaPortal(supabase, {
          evento: "tentativa_apos_conclusao",
          campanhaId: String(campanha.id),
          participanteId: String(participante.id),
          codigoPublico,
          ip,
          detalhes: { origem: "validar" },
        });
      }

      const error =
        codigo === "ja_respondida"
          ? MENSAGEM_JA_RESPONDIDA_CORPO
          : mensagemPorCodigoErro(codigo);

      return NextResponse.json(
        { ok: false, codigo, error },
        { status: 401 }
      );
    }

    const nowIso = new Date().toISOString();
    const jaAcessou = Boolean(participante?.acessou_em);

    const { error: updateError } = await supabase
      .from("riscos_campanha_participantes")
      .update({ acessou_em: nowIso })
      .eq("id", resultado.participanteId)
      .eq("campanha_id", resultado.campanhaId)
      .is("acessou_em", null);

    if (updateError) throw updateError;

    if (!jaAcessou) {
      await registrarAuditoriaPortal(supabase, {
        evento: "primeiro_acesso",
        campanhaId: resultado.campanhaId,
        participanteId: resultado.participanteId,
        codigoPublico: resultado.codigoPublico,
        ip,
      });
    }

    const token = createAvaliacaoSessionToken({
      campanhaId: resultado.campanhaId,
      participanteId: resultado.participanteId,
      codigoPublico: resultado.codigoPublico,
    });

    // Situação pós-identificação (retomada segura — nunca auto-login por cookie).
    const { data: partDetalhe } = await supabase
      .from("riscos_campanha_participantes")
      .select("status, concluiu_em, iniciou_em")
      .eq("id", resultado.participanteId)
      .eq("campanha_id", resultado.campanhaId)
      .maybeSingle();

    let situacao = classificarSituacaoParticipante({
      statusParticipante: String(partDetalhe?.status ?? "pendente"),
      concluiuEm: partDetalhe?.concluiu_em
        ? String(partDetalhe.concluiu_em)
        : null,
      iniciouEm: partDetalhe?.iniciou_em
        ? String(partDetalhe.iniciou_em)
        : null,
      statusSessao: null,
    });

    let retomada: {
      flowIndex: number;
      totalRespondidas: number;
      respostas: Record<string, string>;
    } | null = null;

    if (situacao !== "ja_respondida") {
      const sessao = await buscarSessaoExistente(supabase, {
        campanhaId: resultado.campanhaId,
        participanteId: resultado.participanteId,
      });
      situacao = classificarSituacaoParticipante({
        statusParticipante: String(partDetalhe?.status ?? "pendente"),
        concluiuEm: partDetalhe?.concluiu_em
          ? String(partDetalhe.concluiu_em)
          : null,
        iniciouEm: partDetalhe?.iniciou_em
          ? String(partDetalhe.iniciou_em)
          : null,
        statusSessao: sessao?.status ?? null,
      });

      if (situacao === "em_andamento" && sessao) {
        const respostas = await listarRespostasDaSessao(supabase, {
          sessaoId: sessao.id,
          campanhaId: resultado.campanhaId,
        });
        const { items } = buildCopsoqFlow();
        retomada = {
          flowIndex: calcularFlowIndexRetomada(items, respostas),
          totalRespondidas: respostas.length,
          respostas: mapRespostasParaEstadoLocal(respostas),
        };
      }
    }

    if (situacao === "ja_respondida") {
      console.info("[avaliacao/validar] motivo=participante_ja_concluiu", {
        codigoPublico,
        situacao,
      });
      return NextResponse.json(
        {
          ok: false,
          codigo: "ja_respondida",
          error: MENSAGEM_JA_RESPONDIDA_CORPO,
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      empresaNome: resultado.empresaNome,
      participanteNome: resultado.participanteNome,
      codigoPublico: resultado.codigoPublico,
      situacao,
      retomada,
    });

    response.cookies.set(AVALIACAO_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });

    return response;
  } catch (err) {
    console.error("[avaliacao/validar]", err);
    return NextResponse.json(
      {
        ok: false,
        codigo: "nao_apto",
        error: MENSAGEM_VALIDACAO_GENERICA,
      },
      { status: 500 }
    );
  }
}
