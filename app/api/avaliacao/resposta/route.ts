import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import {
  carregarContextoPortal,
  obterOuCriarSessaoRespostas,
  upsertRespostaSessao,
  validarPayloadResposta,
} from "@/lib/avaliacao-persistencia";
import { deveAvancarParaIniciado } from "@/lib/riscos-campanha-participantes";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * UPSERT de uma resposta do questionário (por pergunta).
 * Isolado por campanha_id + sessão anônima.
 * Após a 1ª resposta válida: status operacional pendente → iniciado.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    const portal = verifyAvaliacaoSessionToken(token);
    if (!portal) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 401 });
    }

    const body = (await request.json()) as {
      codigoPublico?: string;
      perguntaId?: string;
      alternativaId?: string;
      fontes?: string[];
    };

    const codigo = String(body.codigoPublico ?? "")
      .trim()
      .toUpperCase();
    if (codigo && codigo !== portal.codigoPublico) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 403 });
    }

    const perguntaId = String(body.perguntaId ?? "").trim();
    const alternativaId = String(body.alternativaId ?? "").trim();
    if (!perguntaId || !alternativaId) {
      return NextResponse.json(
        { ok: false, codigo: "nao_apto", error: "Dados inválidos." },
        { status: 400 }
      );
    }

    const validado = validarPayloadResposta({
      perguntaId,
      alternativaId,
      fontes: body.fontes,
    });
    if (!validado.ok) {
      return NextResponse.json(
        { ok: false, codigo: "valor_invalido", motivo: validado.motivo },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const ctx = await carregarContextoPortal(supabase, {
      campanhaId: portal.campanhaId,
      participanteId: portal.participanteId,
      codigoPublico: portal.codigoPublico,
    });
    if (!ctx.ok) {
      return NextResponse.json(
        { ok: false, codigo: ctx.codigo },
        { status: ctx.codigo === "nao_apto" ? 401 : 403 }
      );
    }

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

    await upsertRespostaSessao(supabase, {
      sessaoId: sessao.id,
      campanhaId: portal.campanhaId,
      perguntaId: validado.pergunta.id,
      alternativaId: validado.alternativaId,
      valor: validado.valor,
      fontes: validado.fontes,
    });

    // Status operacional: 1ª resposta gravada → Iniciado (nunca regride).
    const { data: partRow } = await supabase
      .from("riscos_campanha_participantes")
      .select("status")
      .eq("id", portal.participanteId)
      .eq("campanha_id", portal.campanhaId)
      .maybeSingle();

    if (partRow && deveAvancarParaIniciado(String(partRow.status ?? ""))) {
      await supabase
        .from("riscos_campanha_participantes")
        .update({ status: "iniciado" })
        .eq("id", portal.participanteId)
        .eq("campanha_id", portal.campanhaId)
        .eq("status", "pendente")
        .is("concluiu_em", null);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[avaliacao/resposta]", err);
    return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 500 });
  }
}
