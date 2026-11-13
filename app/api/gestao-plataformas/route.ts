import { NextResponse } from "next/server";
import type { AcaoGestaoPlataformas } from "@/lib/gestao-plataformas";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import {
  carregarGestaoPlataformas,
  executarGestaoPlataformas,
} from "@/services/gestao-plataformas.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACOES = new Set<AcaoGestaoPlataformas["acao"]>([
  "salvar_plataforma",
  "arquivar_plataforma",
  "reativar_plataforma",
  "salvar_obra",
  "vincular",
  "encerrar_alocacao",
  "salvar_requisito",
  "situacao_requisito",
  "liberar",
  "salvar_curso",
  "inativar_curso",
  "reativar_curso",
  "vincular_lote",
  "solicitar_documento",
  "conferir_documento",
  "solicitar_reenvio",
  "conceder_acesso",
  "revogar_acesso",
]);

export async function GET() {
  try {
    const staff = await requireClientesStaffActor();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }
    const resultado = await carregarGestaoPlataformas({ actor: staff.actor });
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status }
      );
    }
    return NextResponse.json({ ok: true, ...resultado.painel });
  } catch (err) {
    console.error("[api/gestao-plataformas] GET", err);
    return NextResponse.json(
      { error: "Não foi possível carregar a Gestão de Plataformas." },
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
    const body = (await request.json()) as AcaoGestaoPlataformas;
    if (!body || !ACOES.has(body.acao)) {
      return NextResponse.json({ error: "Operação inválida." }, { status: 400 });
    }
    const resultado = await executarGestaoPlataformas({
      acao: body,
      actor: staff.actor,
    });
    if (!resultado.ok) {
      return NextResponse.json(
        { error: resultado.error },
        { status: resultado.status }
      );
    }
    const painel = await carregarGestaoPlataformas({ actor: staff.actor });
    if (!painel.ok) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: true, ...painel.painel });
  } catch (err) {
    console.error("[api/gestao-plataformas] POST", err);
    return NextResponse.json(
      { error: "Não foi possível concluir a operação." },
      { status: 500 }
    );
  }
}
