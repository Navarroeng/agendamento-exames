import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import { registrarAuditoriaPortal } from "@/lib/avaliacao-auditoria";
import { getClientIpFromRequest } from "@/lib/avaliacao-rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { participanteJaConcluiu } from "@/lib/avaliacao-validacao";

export const runtime = "nodejs";

/**
 * Conclui a pesquisa: grava concluiu_em + status respondido.
 * Impede segunda conclusão.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    const sessao = verifyAvaliacaoSessionToken(token);
    if (!sessao) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      codigoPublico?: string;
    };
    const codigo = String(body.codigoPublico ?? "")
      .trim()
      .toUpperCase();
    if (codigo && codigo !== sessao.codigoPublico) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 403 });
    }

    const supabase = createAdminClient();
    const ip = getClientIpFromRequest(request);

    const { data: participante } = await supabase
      .from("riscos_campanha_participantes")
      .select("id, status, concluiu_em")
      .eq("id", sessao.participanteId)
      .eq("campanha_id", sessao.campanhaId)
      .maybeSingle();

    if (!participante) {
      return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 401 });
    }

    if (
      participanteJaConcluiu({
        status: String(participante.status ?? ""),
        concluiu_em: participante.concluiu_em
          ? String(participante.concluiu_em)
          : null,
      })
    ) {
      await registrarAuditoriaPortal(supabase, {
        evento: "tentativa_apos_conclusao",
        campanhaId: sessao.campanhaId,
        participanteId: sessao.participanteId,
        codigoPublico: sessao.codigoPublico,
        ip,
        detalhes: { origem: "concluir" },
      });
      return NextResponse.json(
        { ok: false, codigo: "ja_respondida" },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data: updated, error } = await supabase
      .from("riscos_campanha_participantes")
      .update({
        status: "respondido",
        concluiu_em: nowIso,
      })
      .eq("id", sessao.participanteId)
      .eq("campanha_id", sessao.campanhaId)
      .eq("status", "pendente")
      .is("concluiu_em", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;

    if (!updated) {
      await registrarAuditoriaPortal(supabase, {
        evento: "tentativa_apos_conclusao",
        campanhaId: sessao.campanhaId,
        participanteId: sessao.participanteId,
        codigoPublico: sessao.codigoPublico,
        ip,
        detalhes: { origem: "concluir_conflito" },
      });
      return NextResponse.json(
        { ok: false, codigo: "ja_respondida" },
        { status: 403 }
      );
    }

    await registrarAuditoriaPortal(supabase, {
      evento: "conclusao",
      campanhaId: sessao.campanhaId,
      participanteId: sessao.participanteId,
      codigoPublico: sessao.codigoPublico,
      ip,
      detalhes: { concluiu_em: nowIso },
    });

    const response = NextResponse.json({
      ok: true,
      concluiuEm: nowIso,
      status: "respondido",
    });

    // Encerra sessão para impedir reutilização.
    response.cookies.set(AVALIACAO_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("[avaliacao/concluir]", err);
    return NextResponse.json({ ok: false, codigo: "nao_apto" }, { status: 500 });
  }
}
