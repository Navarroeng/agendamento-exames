import { NextResponse } from "next/server";
import { resolverClienteIdPortalPreview } from "@/lib/portal-cliente";
import { buscarFaturaPortalDetalhe } from "@/services/portal-faturas.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Detalhe de uma fatura no portal.
 * Valida obrigatoriamente que a fatura pertence ao cliente.
 *
 * GET /api/portal/faturas/<faturaId>?cliente_id=<uuid>&cliente_nome=<nome>
 */
export async function GET(
  request: Request,
  { params }: { params: { faturaId: string } }
) {
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

    const { faturaId } = params;
    if (!faturaId?.trim()) {
      return NextResponse.json(
        { error: "ID da fatura obrigatório." },
        { status: 400 }
      );
    }

    const detalhe = await buscarFaturaPortalDetalhe(
      faturaId,
      resolved.clienteId,
      clienteNome
    );

    if (!detalhe) {
      // Não revelar se a fatura existe mas é de outro cliente
      return NextResponse.json(
        { error: "Fatura não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, fatura: detalhe });
  } catch (err) {
    console.error("[api/portal/faturas/detalhe]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar a fatura." },
      { status: 500 }
    );
  }
}
