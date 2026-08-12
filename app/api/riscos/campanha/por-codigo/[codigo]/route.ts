import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selecionarCampanhaPorCodigoPublico } from "@/services/riscos-campanha-status.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Fonte de verdade alinhada ao portal: busca por codigo_publico (mesmo critério do /info).
 */
export async function GET(
  _request: Request,
  context: { params: { codigo: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const codigo = String(context.params.codigo ?? "")
      .trim()
      .toUpperCase();
    if (!codigo) {
      return NextResponse.json({ error: "Código inválido." }, { status: 400 });
    }

    const campanha = await selecionarCampanhaPorCodigoPublico(codigo);
    if (!campanha) {
      return NextResponse.json(
        { error: "Campanha não encontrada." },
        { status: 404 }
      );
    }

    // Retorna o record completo (inclui logo_*). Não filtrar campos —
    // openProcesso sincroniza por este endpoint e sobrescreve o state.
    return NextResponse.json(
      {
        ok: true,
        campanha,
        fonte: "riscos_campanhas.codigo_publico",
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (err) {
    console.error("[riscos/campanha/por-codigo]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar a campanha." },
      { status: 500 }
    );
  }
}
