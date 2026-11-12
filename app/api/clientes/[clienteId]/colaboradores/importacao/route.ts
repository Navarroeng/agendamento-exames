import { NextResponse } from "next/server";
import { isUuid } from "@/lib/colaborador-movimentacoes";
import type { LinhaImportacaoColaborador } from "@/lib/colaborador-importacao";
import { importarColaboradoresLote } from "@/services/colaborador-cadastro.server";
import { requireClientesStaffActor } from "@/services/colaborador-movimentacoes.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/clientes/[clienteId]/colaboradores/importacao
 * Grava os colaboradores novos da planilha na empresa da URL.
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
      confirmacaoId?: string;
      linhas?: LinhaImportacaoColaborador[];
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const linhas = Array.isArray(body.linhas) ? body.linhas : [];
    const result = await importarColaboradoresLote({
      clienteId,
      confirmacaoId: String(body.confirmacaoId ?? ""),
      linhas: linhas.map((linha) => ({
        linha: Number(linha?.linha) || 0,
        nome: String(linha?.nome ?? ""),
        cpf: String(linha?.cpf ?? ""),
        cargo: String(linha?.cargo ?? ""),
        dataAdmissao: String(linha?.dataAdmissao ?? ""),
      })),
      actor: staff.actor,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, erros: result.erros ?? [] },
        { status: result.status }
      );
    }
    return NextResponse.json({
      ok: true,
      adicionados: result.adicionados,
      jaCadastrados: result.jaCadastrados,
      reenvio: result.reenvio,
      colaboradores: result.colaboradores,
      resumo: result.resumo,
    });
  } catch (err) {
    console.error("[api/clientes/colaboradores/importacao]", err);
    return NextResponse.json(
      { error: "Não foi possível importar os colaboradores." },
      { status: 500 }
    );
  }
}
