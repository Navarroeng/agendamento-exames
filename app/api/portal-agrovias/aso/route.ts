import { NextResponse } from "next/server";
import { resolverAcessoExternoAgrovias } from "@/services/acesso-externo-agrovias.server";
import { urlAsoPortal } from "@/services/portal-agrovias-publicacoes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const acesso = await resolverAcessoExternoAgrovias();
    if (!acesso.ok) {
      return NextResponse.json({ error: acesso.error }, { status: acesso.status });
    }
    const id = new URL(request.url).searchParams.get("id") ?? "";
    const resultado = await urlAsoPortal(acesso.acesso.clienteId, id);
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true, url: resultado.url });
  } catch (err) {
    console.error("[api/portal-agrovias/aso] GET", err);
    return NextResponse.json({ error: "Não foi possível abrir o ASO." }, { status: 500 });
  }
}
