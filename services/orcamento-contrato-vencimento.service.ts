import { createClient } from "@/lib/supabase/client";
import { mensagemErroContratoDocumento } from "@/lib/contrato-documento-erro";
import { isDataIsoValida } from "@/lib/contrato-vencimentos";
import type {
  OrcamentoContratoVencimentoInput,
  OrcamentoContratoVencimentoRecord,
} from "@/lib/orcamento-contrato-vencimento";

function throwOnError(
  error: { message?: string; details?: string; hint?: string } | null,
  fallback: string
): void {
  if (!error) return;
  throw new Error(mensagemErroContratoDocumento(error, fallback));
}

function mapRow(
  row: OrcamentoContratoVencimentoRecord
): OrcamentoContratoVencimentoRecord {
  return {
    ...row,
    indice: Number(row.indice) || 0,
    data_vencimento: String(row.data_vencimento ?? "").slice(0, 10),
  };
}

export async function listarContratoVencimentos(
  aprovacaoId: string
): Promise<OrcamentoContratoVencimentoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_contrato_vencimentos")
    .select("*")
    .eq("aprovacao_id", aprovacaoId)
    .order("indice", { ascending: true });
  throwOnError(error, "Não foi possível carregar as datas de vencimento.");
  return (data ?? []).map((row) =>
    mapRow(row as OrcamentoContratoVencimentoRecord)
  );
}

export async function salvarContratoVencimentos(params: {
  aprovacaoId: string;
  orcamentoId: string;
  vencimentos: OrcamentoContratoVencimentoInput[];
}): Promise<OrcamentoContratoVencimentoRecord[]> {
  const rows = params.vencimentos
    .filter((row) => row.indice >= 1 && isDataIsoValida(row.data_vencimento))
    .map((row) => ({
      aprovacao_id: params.aprovacaoId,
      orcamento_id: params.orcamentoId,
      indice: row.indice,
      data_vencimento: row.data_vencimento.trim(),
      updated_at: new Date().toISOString(),
    }));

  const supabase = createClient();
  const { error: delError } = await supabase
    .from("orcamento_contrato_vencimentos")
    .delete()
    .eq("aprovacao_id", params.aprovacaoId);
  throwOnError(delError, "Não foi possível atualizar as datas de vencimento.");

  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from("orcamento_contrato_vencimentos")
    .insert(rows)
    .select("*")
    .order("indice", { ascending: true });
  throwOnError(error, "Não foi possível salvar as datas de vencimento.");
  return (data ?? []).map((row) =>
    mapRow(row as OrcamentoContratoVencimentoRecord)
  );
}
