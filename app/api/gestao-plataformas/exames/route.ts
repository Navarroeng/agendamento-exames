import { NextResponse } from "next/server";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import { listarExamesRealizadosGestao } from "@/services/gestao-plataformas-anexos.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const staff = await requireClientesStaffActor();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }
    const colaboradorId = new URL(request.url).searchParams.get("colaboradorId") ?? "";
    const resultado = await listarExamesRealizadosGestao(colaboradorId);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true, exames: resultado.exames });
  } catch (err) {
    console.error("[api/gestao-plataformas/exames] GET", err);
    return NextResponse.json(
      { error: "Não foi possível carregar os exames realizados." },
      { status: 500 }
    );
  }
}
