import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  AVALIACAO_SESSION_COOKIE,
  verifyAvaliacaoSessionToken,
} from "@/lib/avaliacao-acesso";
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
    const sessao = verifyAvaliacaoSessionToken(token);

    if (!sessao) {
      return NextResponse.json({ ok: false, autenticado: false });
    }

    if (
      codigoPublico &&
      !assertCodigoPublicoSessao(sessao.codigoPublico, codigoPublico)
    ) {
      // Troca manual de URL para outra campanha → bloquear.
      return NextResponse.json(
        {
          ok: false,
          autenticado: false,
          error: "Sessão inválida para esta campanha.",
        },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const { data: campanha } = await supabase
      .from("riscos_campanhas")
      .select("id, empresa_nome, status, codigo_publico")
      .eq("id", sessao.campanhaId)
      .maybeSingle();

    const { data: participante } = await supabase
      .from("riscos_campanha_participantes")
      .select("id, nome_completo, status, concluiu_em, campanha_id")
      .eq("id", sessao.participanteId)
      .eq("campanha_id", sessao.campanhaId)
      .maybeSingle();

    if (!campanha || !participante) {
      return NextResponse.json({ ok: false, autenticado: false });
    }

    if (
      participante.status === "respondido" ||
      participante.concluiu_em
    ) {
      return NextResponse.json(
        {
          ok: false,
          autenticado: false,
          error: "Esta pesquisa já foi concluída.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      autenticado: true,
      empresaNome: String(campanha.empresa_nome ?? ""),
      participanteNome: String(participante.nome_completo ?? ""),
      codigoPublico: String(campanha.codigo_publico ?? "").toUpperCase(),
      campanhaId: sessao.campanhaId,
      participanteId: sessao.participanteId,
    });
  } catch (err) {
    console.error("[avaliacao/sessao]", err);
    return NextResponse.json(
      { ok: false, autenticado: false },
      { status: 500 }
    );
  }
}
