import { NextResponse } from "next/server";
import { resolverClienteIdPortalPreview } from "@/lib/portal-cliente";
import { buscarAgendamentoPortalDetalhe } from "@/services/portal-agendamentos.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Detalhe de agendamento no portal.
 * Valida pertencimento; cancelado/rascunho/outro cliente → 404.
 *
 * GET /api/portal/agendamentos/<id>?cliente_id=<uuid>&cliente_nome=<nome>
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const clienteNome = (url.searchParams.get("cliente_nome") ?? "").trim();
    const agendamentoId = (params.id ?? "").trim();
    if (!agendamentoId) {
      return NextResponse.json(
        { error: "ID do agendamento obrigatório." },
        { status: 400 }
      );
    }

    const detalhe = await buscarAgendamentoPortalDetalhe(
      agendamentoId,
      resolved.clienteId,
      clienteNome
    );

    if (!detalhe) {
      return NextResponse.json(
        { error: "Agendamento não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, agendamento: detalhe });
  } catch (err) {
    console.error("[api/portal/agendamentos/detalhe]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar o agendamento." },
      { status: 500 }
    );
  }
}
