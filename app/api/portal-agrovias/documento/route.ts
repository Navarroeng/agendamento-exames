import { NextResponse } from "next/server";
import { enviarDocumentoPortalAgrovias } from "@/services/acesso-externo-agrovias.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: "Envie o arquivo do documento." }, { status: 400 });
    }
    const resultado = await enviarDocumentoPortalAgrovias({
      documentoId: String(form.get("documentoId") ?? ""),
      arquivo: {
        nome: arquivo.name,
        tipo: arquivo.type,
        bytes: new Uint8Array(await arquivo.arrayBuffer()),
      },
    });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/portal-agrovias/documento] POST", err);
    return NextResponse.json({ error: "Não foi possível enviar o documento." }, { status: 500 });
  }
}
