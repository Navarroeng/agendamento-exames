import { NextResponse } from "next/server";
import { urlDocumentoPortalAgrovias } from "@/services/acesso-externo-agrovias.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const resultado = await urlDocumentoPortalAgrovias(id);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true, url: resultado.url });
  } catch (err) {
    console.error("[api/portal-agrovias/arquivo] GET", err);
    return NextResponse.json({ error: "Não foi possível abrir o arquivo." }, { status: 500 });
  }
}
