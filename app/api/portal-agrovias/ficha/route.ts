import { NextResponse } from "next/server";
import { fichaPortalAgrovias } from "@/services/acesso-externo-agrovias.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const colaboradorId = new URL(request.url).searchParams.get("colaboradorId") ?? "";
    const resultado = await fichaPortalAgrovias(colaboradorId);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[api/portal-agrovias/ficha] GET", err);
    return NextResponse.json({ error: "Não foi possível abrir a ficha." }, { status: 500 });
  }
}
