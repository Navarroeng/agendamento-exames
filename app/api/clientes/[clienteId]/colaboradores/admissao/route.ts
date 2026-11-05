import { NextResponse } from "next/server";
import {
  requireClientesStaffActor,
  salvarAdmissaoColaborador,
} from "@/services/colaborador-movimentacoes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/clientes/[clienteId]/colaboradores/admissao
 * Grava a data de admissão do vínculo (empresa + CPF). Staff da sessão.
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

    let body: {
      cpf?: string;
      data_admissao?: string;
      movimentacao_id?: string | null;
      usuarioNome?: string;
      usuarioEmail?: string;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    void body.usuarioNome;
    void body.usuarioEmail;

    const result = await salvarAdmissaoColaborador({
      clienteId: String(context.params.clienteId ?? ""),
      cpf: String(body.cpf ?? ""),
      dataAdmissao: String(body.data_admissao ?? ""),
      movimentacaoId: body.movimentacao_id,
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
    console.error("[api/clientes/colaboradores/admissao]", err);
    return NextResponse.json(
      { error: "Não foi possível salvar a data de admissão." },
      { status: 500 }
    );
  }
}
