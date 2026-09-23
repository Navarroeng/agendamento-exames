import { NextResponse } from "next/server";
import {
  registrarDesligamentoAdmin,
  requireClientesStaffActor,
} from "@/services/colaborador-movimentacoes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/clientes/[clienteId]/colaboradores/desligamento
 * Cria desligamento_admin. Identidade do ator vem da sessão, não do body.
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
      data_evento?: string;
      motivo?: string;
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

    const result = await registrarDesligamentoAdmin({
      clienteId: String(context.params.clienteId ?? ""),
      cpf: String(body.cpf ?? ""),
      dataEvento: String(body.data_evento ?? ""),
      motivo: body.motivo,
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
    console.error("[api/clientes/colaboradores/desligamento]", err);
    return NextResponse.json(
      { error: "Não foi possível registrar o desligamento." },
      { status: 500 }
    );
  }
}
