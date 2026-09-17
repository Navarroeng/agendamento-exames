import { createClient } from "@/lib/supabase/client";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import {
  listServicosPontuaisContratados,
  type ServicoPontualContratado,
} from "@/lib/servicos-pontuais";
import { buscarAetPorOrcamentoIds } from "@/services/implantacao-aet.service";

function sortAprovacao(
  data: OrcamentoAprovacaoRecord
): OrcamentoAprovacaoRecord {
  return {
    ...data,
    orcamento_aprovacao_itens: [
      ...(data.orcamento_aprovacao_itens ?? []),
    ].sort((a, b) => a.ordem - b.ordem),
  };
}

/**
 * Contratações pontuais do cliente (AET e futuros serviços avulsos),
 * derivadas de orçamentos aprovados + snapshot da aprovação + implantação.
 * Não usa cliente_contratos.
 */
export async function listarServicosPontuaisPorCliente(
  clienteId: string
): Promise<ServicoPontualContratado[]> {
  const id = clienteId.trim();
  if (!id) return [];

  const supabase = createClient();
  const { data: orcamentos, error } = await supabase
    .from("orcamentos")
    .select("id, numero, status, cliente_id")
    .eq("cliente_id", id)
    .eq("status", "aprovado");
  if (error) throw error;

  const rows = (orcamentos ?? []) as Array<{
    id: string;
    numero: string | null;
  }>;
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const { data: aprovacoesRaw, error: aprovacoesError } = await supabase
    .from("orcamento_aprovacoes")
    .select("*, orcamento_aprovacao_itens (*)")
    .in("orcamento_id", ids);
  if (aprovacoesError) throw aprovacoesError;

  const aprovacoesByOrcamentoId = new Map<string, OrcamentoAprovacaoRecord>();
  for (const row of (aprovacoesRaw ?? []) as OrcamentoAprovacaoRecord[]) {
    aprovacoesByOrcamentoId.set(row.orcamento_id, sortAprovacao(row));
  }

  const aetByOrcamentoId = await buscarAetPorOrcamentoIds(ids);
  return listServicosPontuaisContratados({
    orcamentos: rows,
    aprovacoesByOrcamentoId,
    aetByOrcamentoId,
  });
}
