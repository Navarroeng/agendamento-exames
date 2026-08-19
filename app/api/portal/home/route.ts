import { NextResponse } from "next/server";
import {
  dtoContemCampoProibido,
  portalResumoVazio,
  resolvePortalDevClienteId,
  resolverClienteIdPortalPreview,
} from "@/lib/portal-cliente";
import { carregarPortalHome } from "@/services/portal-home.server";
import { requirePortalStaffUser } from "@/services/portal-staff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Preview interno da Home do Portal.
 * Exige sessão staff. cliente_id na query é validado no servidor.
 */
export async function GET(request: Request) {
  try {
    const staff = await requirePortalStaffUser();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }

    const url = new URL(request.url);
    const requested = url.searchParams.get("cliente_id");
    const resolved = resolverClienteIdPortalPreview({
      requestedClienteId: requested,
      envClienteId: resolvePortalDevClienteId(),
    });

    if (!resolved.ok) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    }

    if (!resolved.clienteId) {
      const resumo = portalResumoVazio();
      const vazamento = dtoContemCampoProibido(resumo);
      if (vazamento) {
        return NextResponse.json(
          { error: "Resposta do portal recusada por privacidade." },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ok: true,
        precisaSelecionar: true,
        resumo,
      });
    }

    const { resumo } = await carregarPortalHome(resolved.clienteId);
    const vazamento = dtoContemCampoProibido(resumo);
    if (vazamento) {
      console.error("[api/portal/home] DTO com campo proibido:", vazamento);
      return NextResponse.json(
        { error: "Resposta do portal recusada por privacidade." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      precisaSelecionar: false,
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
