import { NextResponse } from "next/server";
import { isUuid } from "@/lib/colaborador-movimentacoes";
import type { PropostaOcupacaoVaga } from "@/lib/colaborador-vaga-ocupacao";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import { validarEPreservarOcupacaoVagas } from "@/services/colaborador-vaga-ocupacao.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/clientes/[clienteId]/colaboradores/ocupacao-vaga
 * Confere se a vaga recebe só colaborador já ativo e preserva
 * o cadastro legado antes de liberar a ocupação.
 */
export async function POST(
  request: Request,
  context: { params: { clienteId: string } }
) {
  try {
    const staff = await requireClientesStaffActor();
    if (!staff.ok) {
      return NextResponse.json({ error: staff.error }, { status: staff.status });
    }

    const clienteId = String(context.params.clienteId ?? "").trim();
    if (!isUuid(clienteId)) {
      return NextResponse.json({ error: "Cliente inválido." }, { status: 400 });
    }

    let body: {
      contratoId?: string;
      propostas?: PropostaOcupacaoVaga[];
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const result = await validarEPreservarOcupacaoVagas({
      clienteId,
      contratoId: String(body.contratoId ?? ""),
      propostas: Array.isArray(body.propostas) ? body.propostas : [],
      actor: staff.actor,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/clientes/colaboradores/ocupacao-vaga]", err);
    return NextResponse.json(
      { error: "Não foi possível validar a ocupação das vagas." },
      { status: 500 }
    );
  }
}
