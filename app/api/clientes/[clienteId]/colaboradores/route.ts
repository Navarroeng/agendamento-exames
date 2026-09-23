import { NextResponse } from "next/server";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import { listarColaboradoresPortal } from "@/services/portal-colaboradores.server";
import { isUuid } from "@/lib/colaborador-movimentacoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/clientes/[clienteId]/colaboradores
 * Relação consolidada (mesma do Portal). Somente staff.
 */
export async function GET(
  _request: Request,
  context: { params: { clienteId: string } }
) {
  try {
    const staff = await requireClientesStaffActor();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }

    const clienteId = String(context.params.clienteId ?? "").trim();
    if (!isUuid(clienteId)) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    }

    const { colaboradores, resumo } = await listarColaboradoresPortal(clienteId);
    return NextResponse.json({ ok: true, colaboradores, resumo });
  } catch (err) {
    console.error("[api/clientes/colaboradores]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar os colaboradores." },
      { status: 500 }
    );
  }
}
