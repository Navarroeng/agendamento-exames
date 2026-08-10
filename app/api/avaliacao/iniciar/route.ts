import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Marca início do questionário (participação). Requer sessão válida.
 */
export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AVALIACAO_SESSION_COOKIE)?.value;
    const sessao = verifyAvaliacaoSessionToken(token);
    if (!sessao) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      codigoPublico?: string;
    };
    const codigo = String(body.codigoPublico ?? "")
      .trim()
      .toUpperCase();
    if (codigo && codigo !== sessao.codigoPublico) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();
    await supabase
      .from("riscos_campanha_participantes")
      .update({ iniciou_em: nowIso })
      .eq("id", sessao.participanteId)
      .eq("campanha_id", sessao.campanhaId)
      .is("iniciou_em", null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[avaliacao/iniciar]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
