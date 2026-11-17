import { NextResponse } from "next/server";
import { autorizarEquipeAgrovias } from "@/services/portal-agrovias-publicacao-auth.server";
import { urlPublicacaoInterna } from "@/services/portal-agrovias-publicacoes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = await autorizarEquipeAgrovias();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const url = new URL(request.url);
    const origem = url.searchParams.get("origem");
    if (origem !== "sst" && origem !== "aso") {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    }
    const resultado = await urlPublicacaoInterna({
      clienteId: auth.clienteId,
      id: url.searchParams.get("id") ?? "",
      origem,
    });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true, url: resultado.url });
  } catch (err) {
    console.error("[api/gestao-plataformas/publicacao] GET", err);
    return NextResponse.json({ error: "Não foi possível abrir o arquivo." }, { status: 500 });
  }
}
