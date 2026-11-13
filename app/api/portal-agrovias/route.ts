import { NextResponse } from "next/server";
import { listarPortalAgrovias } from "@/services/acesso-externo-agrovias.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const resultado = await listarPortalAgrovias();
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json(resultado);
  } catch (err) {
    console.error("[api/portal-agrovias] GET", err);
    return NextResponse.json({ error: "Não foi possível abrir os colaboradores." }, { status: 500 });
  }
}
