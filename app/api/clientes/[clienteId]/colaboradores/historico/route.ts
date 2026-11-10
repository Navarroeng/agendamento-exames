import { NextResponse } from "next/server";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";
import { listarHistoricoExamesColaborador } from "@/services/portal-colaboradores.server";
import { isUuid } from "@/lib/colaborador-movimentacoes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/clientes/[clienteId]/colaboradores/historico
 * Exames do colaborador na empresa, inclusive de contratos anteriores.
 * Somente staff. Não altera agendamentos.
 */
export async function GET(
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

    const url = new URL(request.url);
    const cpf = url.searchParams.get("cpf");
    const agendamentoId = String(url.searchParams.get("agendamentoId") ?? "").trim();
    if (agendamentoId && !isUuid(agendamentoId)) {
      return NextResponse.json({ error: "Exame inválido." }, { status: 400 });
    }

    const exames = await listarHistoricoExamesColaborador({
      clienteId,
      cpf,
      agendamentoId,
    });
    return NextResponse.json({ ok: true, exames });
  } catch (err) {
    console.error("[api/clientes/colaboradores/historico]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar o histórico." },
      { status: 500 }
    );
  }
}
