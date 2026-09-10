import { NextResponse } from "next/server";
import { resolverClienteIdPortalPreview } from "@/lib/portal-cliente";
import { obterUrlAnexoLaudoSstPortal } from "@/services/portal-laudos-sst.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signed URL de anexo liberado (PGR/PCMSO/LTCAT).
 * GET /api/portal/laudos-sst/[orcamentoId]/anexo?tipo=pgr&cliente_id=
 */
export async function GET(
  request: Request,
  { params }: { params: { orcamentoId: string } }
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

    const orcamentoId = (params.orcamentoId ?? "").trim();
    const tipo = (url.searchParams.get("tipo") ?? "").trim().toLowerCase();
    if (!orcamentoId || !tipo) {
      return NextResponse.json(
        { error: "Parâmetros inválidos." },
        { status: 400 }
      );
    }

    const result = await obterUrlAnexoLaudoSstPortal({
      clienteId: resolved.clienteId,
      orcamentoId,
      tipo,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Documento não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: result.url,
      nomeArquivo: result.nomeArquivo,
    });
  } catch (err) {
    console.error("[api/portal/laudos-sst/anexo]", err);
    return NextResponse.json(
      { error: "Não foi possível abrir o documento." },
      { status: 500 }
    );
  }
}
