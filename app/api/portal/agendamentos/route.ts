import { NextResponse } from "next/server";
import { resolverClienteIdPortalPreview } from "@/lib/portal-cliente";
import { listarAgendamentosPortal } from "@/services/portal-agendamentos.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lista agendamentos do cliente no portal (somente consulta).
 * Cancelados e rascunhos já ficam fora da consulta server-side.
 *
 * GET /api/portal/agendamentos?cliente_id=<uuid>&cliente_nome=<nome>
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

    const clienteNome = (url.searchParams.get("cliente_nome") ?? "").trim();
    const { agendamentos, resumo } = await listarAgendamentosPortal(
      resolved.clienteId,
      clienteNome
    );

    return NextResponse.json({ ok: true, agendamentos, resumo });
  } catch (err) {
    console.error("[api/portal/agendamentos]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar os agendamentos." },
      { status: 500 }
    );
  }
}
