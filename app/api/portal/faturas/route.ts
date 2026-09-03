import { NextResponse } from "next/server";
import { resolverClienteIdPortalPreview } from "@/lib/portal-cliente";
import { listarFaturasPortal } from "@/services/portal-faturas.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lista faturas do cliente para o portal.
 * Requer sessão staff. Isolamento garantido pelo service server-side.
 *
 * GET /api/portal/faturas?cliente_id=<uuid>&cliente_nome=<nome>
 */
export async function GET(request: Request) {
  try {
    const staff = await requirePortalStaffUser();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }

    const url = new URL(request.url);
    const resolved = resolverClienteIdPortalPreview({
      requestedClienteId: url.searchParams.get("cliente_id"),
      envClienteId: process.env[
        "PORTAL_DEV_CLIENTE_ID"
      ] as string | undefined,
    });

    if (!resolved.ok || !resolved.clienteId) {
      return NextResponse.json(
        { error: "Cliente inválido." },
        { status: 400 }
      );
    }

    const clienteNome = (
      url.searchParams.get("cliente_nome") ?? ""
    ).trim();

    const { faturas, resumo } = await listarFaturasPortal(
      resolved.clienteId,
      clienteNome
    );

    return NextResponse.json({ ok: true, faturas, resumo });
  } catch (err) {
    console.error("[api/portal/faturas]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar as faturas." },
      { status: 500 }
    );
  }
}
