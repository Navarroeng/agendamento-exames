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
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Marca início do questionário e devolve respostas já salvas (retomada).
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    const portal = verifyAvaliacaoSessionToken(token);
    if (!portal) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      codigoPublico?: string;
    };
    const codigo = String(body.codigoPublico ?? "")
      .trim()
      .toUpperCase();
    if (codigo && codigo !== portal.codigoPublico) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 403 });
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
          detalhes: { origem: "iniciar" },
        });
      }
      if (ctx.codigo === "ja_respondida") {
        await registrarAuditoriaPortal(supabase, {
          evento: "tentativa_apos_conclusao",
          campanhaId: portal.campanhaId,
          participanteId: portal.participanteId,
          codigoPublico: portal.codigoPublico,
          ip,
          detalhes: { origem: "iniciar" },
        });
      }
      return NextResponse.json(
        { ok: false, codigo: ctx.codigo },
        { status: 403 }
      );
    }

    const { data: participanteRow } = await supabase
      .from("riscos_campanha_participantes")
      .select("iniciou_em")
      .eq("id", portal.participanteId)
      .eq("campanha_id", portal.campanhaId)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    const jaIniciou = Boolean(participanteRow?.iniciou_em);

    await supabase
      .from("riscos_campanha_participantes")
      .update({ iniciou_em: nowIso })
      .eq("id", portal.participanteId)
      .eq("campanha_id", portal.campanhaId)
      .is("iniciou_em", null);

    const sessao = await obterOuCriarSessaoRespostas(supabase, {
      campanhaId: portal.campanhaId,
      participanteId: portal.participanteId,
    });

    if (sessao.status === "concluida") {
      return NextResponse.json(
        { ok: false, codigo: "ja_respondida" },
        { status: 403 }
      );
    }

    if (!jaIniciou) {
      await registrarAuditoriaPortal(supabase, {
        evento: "inicio_pesquisa",
        campanhaId: portal.campanhaId,
        participanteId: portal.participanteId,
        codigoPublico: portal.codigoPublico,
        ip,
      });
    }

    const respostas = await listarRespostasDaSessao(supabase, {
      sessaoId: sessao.id,
      campanhaId: portal.campanhaId,
    });
    const { items } = buildCopsoqFlow();
    const flowIndex = calcularFlowIndexRetomada(items, respostas);

    return NextResponse.json({
      ok: true,
      retomada: respostas.length > 0,
      flowIndex,
      respostas: mapRespostasParaEstadoLocal(respostas),
      totalRespondidas: respostas.length,
    });
  } catch (err) {
    console.error("[avaliacao/iniciar]", err);
    return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 500 });
  }
}
