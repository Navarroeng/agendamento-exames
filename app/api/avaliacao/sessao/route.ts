import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import { registrarAuditoriaPortal } from "@/lib/avaliacao-auditoria";
import { getClientIpFromRequest } from "@/lib/avaliacao-rate-limit";
import { buildCopsoqFlow } from "@/lib/copsoq";
import {
  calcularFlowIndexRetomada,
  carregarContextoPortal,
  listarRespostasDaSessao,
  mapRespostasParaEstadoLocal,
  obterOuCriarSessaoRespostas,
} from "@/lib/avaliacao-persistencia";
import { assertCodigoPublicoSessao } from "@/lib/avaliacao-validacao";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigoPublico = String(searchParams.get("codigoPublico") ?? "")
      .trim()
      .toUpperCase();

    const cookieStore = cookies();
    const token = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    const portal = verifyAvaliacaoSessionToken(token);

    if (!portal) {
      return NextResponse.json({ ok: false, autenticado: false });
    }

    if (
      codigoPublico &&
      !assertCodigoPublicoSessao(portal.codigoPublico, codigoPublico)
    ) {
      return NextResponse.json(
        { ok: false, autenticado: false, codigo: "nao_apto" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const ip = getClientIpFromRequest(request);

    const ctx = await carregarContextoPortal(supabase, {
      campanhaId: portal.campanhaId,
      participanteId: portal.participanteId,
      codigoPublico: portal.codigoPublico,
    });

    if (!ctx.ok) {
      if (ctx.codigo === "campanha_encerrada" || ctx.codigo === "prazo_encerrado") {
        await registrarAuditoriaPortal(supabase, {
          evento: "tentativa_apos_encerramento",
          campanhaId: portal.campanhaId,
          participanteId: portal.participanteId,
          codigoPublico: portal.codigoPublico,
          ip,
          detalhes: { origem: "sessao" },
        });
      }
      if (ctx.codigo === "ja_respondida") {
        await registrarAuditoriaPortal(supabase, {
          evento: "tentativa_apos_conclusao",
          campanhaId: portal.campanhaId,
          participanteId: portal.participanteId,
          codigoPublico: portal.codigoPublico,
          ip,
          detalhes: { origem: "sessao" },
        });
      }
      return NextResponse.json(
        { ok: false, autenticado: false, codigo: ctx.codigo },
        { status: 403 }
      );
    }

    const { data: participante } = await supabase
      .from("riscos_campanha_participantes")
      .select("nome_completo, iniciou_em")
      .eq("id", portal.participanteId)
      .eq("campanha_id", portal.campanhaId)
      .maybeSingle();

    const { data: campanha } = await supabase
      .from("riscos_campanhas")
      .select("empresa_nome, codigo_publico")
      .eq("id", portal.campanhaId)
      .maybeSingle();

    let respostasMap: Record<string, string> = {};
    let flowIndex = 0;
    let totalRespondidas = 0;
    let questionarioIniciado = Boolean(participante?.iniciou_em);

    if (questionarioIniciado) {
      const sessao = await obterOuCriarSessaoRespostas(supabase, {
        campanhaId: portal.campanhaId,
        participanteId: portal.participanteId,
      });
      if (sessao.status === "concluida") {
        return NextResponse.json(
          { ok: false, autenticado: false, codigo: "ja_respondida" },
          { status: 403 }
        );
      }
      const respostas = await listarRespostasDaSessao(supabase, {
        sessaoId: sessao.id,
        campanhaId: portal.campanhaId,
      });
      respostasMap = mapRespostasParaEstadoLocal(respostas);
      totalRespondidas = respostas.length;
      const { items } = buildCopsoqFlow();
      flowIndex = calcularFlowIndexRetomada(items, respostas);
    }

    return NextResponse.json({
      ok: true,
      autenticado: true,
      empresaNome: String(campanha?.empresa_nome ?? ""),
      participanteNome: String(participante?.nome_completo ?? ""),
      codigoPublico: String(campanha?.codigo_publico ?? "").toUpperCase(),
      campanhaId: portal.campanhaId,
      participanteId: portal.participanteId,
      questionarioIniciado,
      flowIndex,
      totalRespondidas,
      respostas: respostasMap,
    });
  } catch (err) {
    console.error("[avaliacao/sessao]", err);
    return NextResponse.json(
      { ok: false, autenticado: false },
      { status: 500 }
    );
  }
}
