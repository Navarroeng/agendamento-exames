import { NextResponse } from "next/server";
import { isUuid } from "@/lib/colaborador-movimentacoes";
import { criarColaboradorManual } from "@/services/colaborador-cadastro.server";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/clientes/[clienteId]/colaboradores/inclusao
 * Cadastra o colaborador na lista da empresa, sem agendamento e sem vaga.
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
      nome?: string;
      cpf?: string | null;
      cargo?: string | null;
      dataAdmissao?: string | null;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const result = await criarColaboradorManual({
      clienteId,
      nome: String(body.nome ?? ""),
      cpf: body.cpf ?? null,
      cargo: body.cargo ?? null,
      dataAdmissao: body.dataAdmissao ?? null,
      actor: staff.actor,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      colaboradores: result.colaboradores,
      resumo: result.resumo,
    });
  } catch (err) {
    console.error("[api/clientes/colaboradores/inclusao]", err);
    return NextResponse.json(
      { error: "Não foi possível adicionar o colaborador." },
      { status: 500 }
    );
  }
}
