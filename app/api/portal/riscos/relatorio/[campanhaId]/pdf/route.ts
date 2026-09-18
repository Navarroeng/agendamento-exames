import { NextResponse } from "next/server";
import {
  resolvePortalDevClienteId,
  resolverClienteIdPortalPreview,
} from "@/lib/portal-cliente";
import { gerarPdfRelatorioPortalCliente } from "@/services/portal-riscos-relatorio.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * PDF do mesmo RelatorioDocumento da área administrativa.
 * Isolado por cliente autenticado no preview do Portal.
 */
export async function GET(
  request: Request,
  { params }: { params: { campanhaId: string } }
) {
  try {
    const staff = await requirePortalStaffUser();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }

    const url = new URL(request.url);
    const resolved = resolverClienteIdPortalPreview({
      requestedClienteId: url.searchParams.get("cliente_id"),
      envClienteId: resolvePortalDevClienteId(),
    });

    if (!resolved.ok || !resolved.clienteId) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    }

    const campanhaId = String(params.campanhaId ?? "").trim();
    const result = await gerarPdfRelatorioPortalCliente({
      clienteId: resolved.clienteId,
      campanhaId,
      request,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/portal/riscos/relatorio/pdf]", err);
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF do relatório." },
      { status: 500 }
    );
  }
}
