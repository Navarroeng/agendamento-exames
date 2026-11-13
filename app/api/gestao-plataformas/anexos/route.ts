import { NextResponse } from "next/server";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import {
  gravarAnexoGestao,
  urlAnexoGestao,
} from "@/services/gestao-plataformas-anexos.server";
import { carregarGestaoPlataformas } from "@/services/gestao-plataformas.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const staff = await requireClientesStaffActor();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }
    const url = new URL(request.url);
    const tipo = url.searchParams.get("tipo");
    const id = String(url.searchParams.get("id") ?? "");
    if ((tipo !== "certificado" && tipo !== "rh") || !id) {
      return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
    }
    const resultado = await urlAnexoGestao({ tipo, id });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ ok: true, url: resultado.url });
  } catch (err) {
    console.error("[api/gestao-plataformas/anexos] GET", err);
    return NextResponse.json(
      { error: "Não foi possível abrir o arquivo." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireClientesStaffActor();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }
    const form = await request.formData();
    const tipo = String(form.get("tipo") ?? "");
    const arquivo = form.get("arquivo");
    if ((tipo !== "certificado" && tipo !== "rh") || !(arquivo instanceof File)) {
      return NextResponse.json({ error: "Envie o arquivo e o tipo do anexo." }, { status: 400 });
    }
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const resultado = await gravarAnexoGestao({
      tipo,
      colaboradorId: String(form.get("colaboradorId") ?? ""),
      cursoId: String(form.get("cursoId") ?? ""),
      realizadoEm: String(form.get("realizadoEm") ?? ""),
      validade: String(form.get("validade") ?? ""),
      identificacao: String(form.get("identificacao") ?? ""),
      responsavel: staff.actor.usuarioNome,
      arquivo: { nome: arquivo.name, tipo: arquivo.type, bytes },
    });
    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    const painel = await carregarGestaoPlataformas({ actor: staff.actor });
    if (!painel.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: true, ...painel.painel });
  } catch (err) {
    console.error("[api/gestao-plataformas/anexos] POST", err);
    return NextResponse.json(
      { error: "Não foi possível guardar o arquivo." },
      { status: 500 }
    );
  }
}
