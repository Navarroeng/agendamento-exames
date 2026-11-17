import { NextResponse } from "next/server";
import { autorizarPublicacaoAgrovias } from "@/services/portal-agrovias-publicacao-auth.server";
import { publicarDocumentoSst } from "@/services/portal-agrovias-publicacoes.server";
import { carregarGestaoPlataformas } from "@/services/gestao-plataformas.server";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = await autorizarPublicacaoAgrovias();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const form = await request.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: "Envie o PDF do documento." }, { status: 400 });
    }
    const resultado = await publicarDocumentoSst({
      clienteId: auth.clienteId,
      userId: auth.userId,
      tipo: String(form.get("tipo") ?? ""),
      arquivo: {
        nome: arquivo.name,
        tipo: arquivo.type,
        bytes: new Uint8Array(await arquivo.arrayBuffer()),
      },
    });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    const staff = await requireClientesStaffActor();
    if (!staff.ok) return NextResponse.json({ ok: true });
    const painel = await carregarGestaoPlataformas({ actor: staff.actor });
    if (!painel.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: true, ...painel.painel });
  } catch (err) {
    console.error("[api/gestao-plataformas/sst] POST", err);
    return NextResponse.json({ error: "Não foi possível publicar o documento." }, { status: 500 });
  }
}
