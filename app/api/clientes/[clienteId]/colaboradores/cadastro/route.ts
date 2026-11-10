import { NextResponse } from "next/server";
import { isUuid } from "@/lib/colaborador-movimentacoes";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import { salvarCadastroColaborador } from "@/services/colaborador-cadastro.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/clientes/[clienteId]/colaboradores/cadastro
 * Corrige o cadastro e replica nos vínculos já existentes da empresa.
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
      cpfAtual?: string | null;
      agendamentoId?: string | null;
      vagaId?: string | null;
      nome?: string;
      cpf?: string | null;
      cargo?: string | null;
      dataAdmissao?: string | null;
      dataDesligamento?: string | null;
      desligamentoMovimentacaoId?: string | null;
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

    const result = await salvarCadastroColaborador({
      clienteId,
      identidade: {
        cpf: body.cpfAtual ?? null,
        agendamentoId: body.agendamentoId ?? null,
        vagaId: body.vagaId ?? null,
      },
      nome: String(body.nome ?? ""),
      cpf: body.cpf ?? null,
      cargo: body.cargo ?? null,
      dataAdmissao: body.dataAdmissao ?? null,
      dataDesligamento: body.dataDesligamento ?? null,
      desligamentoMovimentacaoId: body.desligamentoMovimentacaoId ?? null,
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
    console.error("[api/clientes/colaboradores/cadastro]", err);
    return NextResponse.json(
      { error: "Não foi possível salvar o colaborador." },
      { status: 500 }
    );
  }
}
