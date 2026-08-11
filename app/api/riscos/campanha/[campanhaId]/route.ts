import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isRiscosCampanhaStatus,
  type RiscosCampanhaRecord,
  type RiscosCampanhaStatus,
} from "@/lib/riscos-campanha";
import { normalizeRiscosCampanhaOrigem } from "@/lib/riscos-campanha-origem";

export const runtime = "nodejs";

const CAMPANHA_SELECT =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, origem, responsavel, observacoes, criado_por, created_at, updated_at";

const CAMPANHA_SELECT_LEGACY =
  "id, orcamento_id, cliente_id, cnpj, empresa_nome, data_inicio, data_encerramento, quantidade_prevista, status, codigo_publico, codigo_acesso_exibicao, criado_por, created_at, updated_at";

function mapCampanhaRow(row: Record<string, unknown>): RiscosCampanhaRecord {
  const statusRaw = String(row.status ?? "em_preparacao");
  const status: RiscosCampanhaStatus = isRiscosCampanhaStatus(statusRaw)
    ? statusRaw
    : "em_preparacao";

  return {
    id: String(row.id),
    orcamento_id: row.orcamento_id ? String(row.orcamento_id) : null,
    cliente_id: row.cliente_id ? String(row.cliente_id) : null,
    cnpj: String(row.cnpj ?? ""),
    empresa_nome: String(row.empresa_nome ?? ""),
    data_inicio: String(row.data_inicio ?? "").slice(0, 10),
    data_encerramento: String(row.data_encerramento ?? "").slice(0, 10),
    quantidade_prevista: Number(row.quantidade_prevista) || 0,
    status,
    codigo_publico: String(row.codigo_publico ?? ""),
    codigo_acesso_exibicao: row.codigo_acesso_exibicao
      ? String(row.codigo_acesso_exibicao)
      : null,
    origem: normalizeRiscosCampanhaOrigem(
      row.origem != null ? String(row.origem) : undefined
    ),
    responsavel: row.responsavel ? String(row.responsavel) : null,
    observacoes: row.observacoes ? String(row.observacoes) : null,
    criado_por: row.criado_por ? String(row.criado_por) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/**
 * Lê a campanha persistida (fonte de verdade para o painel admin).
 */
export async function GET(
  _request: Request,
  context: { params: { campanhaId: string } }
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const campanhaId = String(context.params.campanhaId ?? "").trim();
    if (!campanhaId) {
      return NextResponse.json({ error: "Campanha inválida." }, { status: 400 });
    }

    const admin = createAdminClient();
    const primary = await admin
      .from("riscos_campanhas")
      .select(CAMPANHA_SELECT)
      .eq("id", campanhaId)
      .maybeSingle();

    let row = primary.data as Record<string, unknown> | null;
    let error = primary.error;

    if (
      error &&
      (/origem|responsavel|observacoes/i.test(error.message ?? "") ||
        error.code === "42703")
    ) {
      const fb = await admin
        .from("riscos_campanhas")
        .select(CAMPANHA_SELECT_LEGACY)
        .eq("id", campanhaId)
        .maybeSingle();
      row = fb.data as Record<string, unknown> | null;
      error = fb.error;
    }

    if (error) throw error;
    if (!row) {
      return NextResponse.json(
        { error: "Campanha não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, campanha: mapCampanhaRow(row) });
  } catch (err) {
    console.error("[riscos/campanha/GET]", err);
    return NextResponse.json(
      { error: "Não foi possível carregar a campanha." },
      { status: 500 }
    );
  }
}
