import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  MENSAGEM_VALIDACAO_GENERICA,
  createAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import {
  checkAvaliacaoRateLimit,
  getClientIpFromRequest,
} from "@/lib/avaliacao-rate-limit";
import { parseDataNascimentoBr } from "@/lib/date-br";
import { normalizeCpfDigits, isValidCPF } from "@/lib/cpf";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarAcessoAvaliacao } from "@/lib/avaliacao-validacao";

export const runtime = "nodejs";

const CAMPANHA_SELECT =
  "id, codigo_publico, cliente_id, cnpj, empresa_nome, status, data_inicio, data_encerramento";

const PARTICIPANTE_SELECT =
  "id, campanha_id, cpf, data_nascimento, nome_completo, status, concluiu_em";

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
      return NextResponse.json(
        { ok: false, error: MENSAGEM_VALIDACAO_GENERICA },
        {
          status: 429,
          headers: rate.retryAfterSec
            ? { "Retry-After": String(rate.retryAfterSec) }
            : undefined,
        }
      );
    }

    if (!codigoPublico || !isValidCPF(cpfDigits) || !dataNascimentoIso) {
      return NextResponse.json(
        { ok: false, error: MENSAGEM_VALIDACAO_GENERICA },
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
      const { data, error } = await supabase
        .from("riscos_campanha_participantes")
        .select(PARTICIPANTE_SELECT)
        .eq("campanha_id", campanha.id)
        .eq("cpf", cpfDigits)
        .maybeSingle();
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
          }
        : null,
    });

    if (!resultado.ok) {
      return NextResponse.json(
        { ok: false, error: MENSAGEM_VALIDACAO_GENERICA },
        { status: 401 }
      );
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("riscos_campanha_participantes")
      .update({ acessou_em: nowIso })
      .eq("id", resultado.participanteId)
      .eq("campanha_id", resultado.campanhaId)
      .is("acessou_em", null);

    const token = createAvaliacaoSessionToken({
      campanhaId: resultado.campanhaId,
      participanteId: resultado.participanteId,
      codigoPublico: resultado.codigoPublico,
    });

    const response = NextResponse.json({
      ok: true,
      empresaNome: resultado.empresaNome,
      participanteNome: resultado.participanteNome,
      codigoPublico: resultado.codigoPublico,
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
      { ok: false, error: MENSAGEM_VALIDACAO_GENERICA },
      { status: 500 }
    );
  }
}
