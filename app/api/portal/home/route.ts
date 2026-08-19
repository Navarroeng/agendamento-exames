import { NextResponse } from "next/server";
import { dtoContemCampoProibido } from "@/lib/portal-cliente";
import { carregarPortalHome } from "@/services/portal-home.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Home do Portal do Cliente.
 * Cliente vem SOMENTE de PORTAL_DEV_CLIENTE_ID (server-side).
 * Query string é ignorada de propósito.
 */
export async function GET() {
  try {
    const { habilitado, resumo } = await carregarPortalHome();

    const vazamento = dtoContemCampoProibido(resumo);
    if (vazamento) {
      console.error("[api/portal/home] DTO com campo proibido:", vazamento);
      return NextResponse.json(
        { error: "Resposta do portal recusada por privacidade." },
        { status: 500 }
      );
    }

    if (!habilitado) {
      return NextResponse.json({
        ok: true,
        habilitado: false,
        resumo,
      });
    }

    return NextResponse.json({
      ok: true,
      habilitado: true,
      resumo,
    });
  } catch (err) {
    console.error("[api/portal/home]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar o portal." },
      { status: 500 }
    );
  }
}
