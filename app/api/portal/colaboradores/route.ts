import { NextResponse } from "next/server";
import { resolverClienteIdPortalPreview } from "@/lib/portal-cliente";
import { listarColaboradoresPortal } from "@/services/portal-colaboradores.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lista colaboradores consolidados do cliente (somente leitura).
 * GET /api/portal/colaboradores?cliente_id=<uuid>
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
      envClienteId: process.env["PORTAL_DEV_CLIENTE_ID"] as string | undefined,
    });

    if (!resolved.ok || !resolved.clienteId) {
      return NextResponse.json(
        { error: "Cliente inválido." },
        { status: 400 }
      );
    }

    const { colaboradores, resumo } = await listarColaboradoresPortal(
      resolved.clienteId
    );

    return NextResponse.json({ ok: true, colaboradores, resumo });
  } catch (err) {
    console.error("[api/portal/colaboradores]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar os colaboradores." },
      { status: 500 }
    );
  }
}
