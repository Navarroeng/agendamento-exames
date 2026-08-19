import { NextResponse } from "next/server";
import { dtoContemCampoProibido } from "@/lib/portal-cliente";
import { listarEmpresasPortalPreview } from "@/services/portal-home.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lista clientes com campanha de Riscos — preview interno staff. */
export async function GET() {
  try {
    const staff = await requirePortalStaffUser();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }

    const empresas = await listarEmpresasPortalPreview();
    const vazamento = dtoContemCampoProibido(empresas);
    if (vazamento) {
      return NextResponse.json(
        { error: "Resposta do portal recusada por privacidade." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, empresas });
  } catch (err) {
    console.error("[api/portal/empresas]", err);
    return NextResponse.json(
      { error: "Não foi possível listar as empresas." },
      { status: 500 }
    );
  }
}
