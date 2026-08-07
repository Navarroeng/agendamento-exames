import { createClient } from "@/lib/supabase/client";
import {
  buildLaudosSstProcesso,
  isProcessoElegivelLaudosSst,
  sortLaudosSstProcessos,
  type LaudosSstProcesso,
  type OrcamentoLaudosSstRecord,
} from "@/lib/laudos-sst";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";

/**
 * Lista processos elegíveis a Laudos SST a partir da Implantação concluída.
 * Não cria cadastro duplicado de cliente/orçamento/contrato.
 */
export async function listarProcessosLaudosSst(): Promise<LaudosSstProcesso[]> {
  const implantacao = await listarProcessosImplantacao();
  const elegiveis = implantacao.filter(isProcessoElegivelLaudosSst);
  if (elegiveis.length === 0) return [];

  const ids = elegiveis.map((p) => p.orcamento.id);
  const trackingMap = await buscarTrackingLaudosSst(ids);

  const processos = elegiveis.map((p) =>
    buildLaudosSstProcesso(p, trackingMap.get(p.orcamento.id) ?? null)
  );

  return sortLaudosSstProcessos(processos);
}

async function buscarTrackingLaudosSst(
  orcamentoIds: string[]
): Promise<Map<string, OrcamentoLaudosSstRecord>> {
  const map = new Map<string, OrcamentoLaudosSstRecord>();
  if (orcamentoIds.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_laudos_sst")
    .select("orcamento_id, etapa_atual, etapas_concluidas, created_at, updated_at")
    .in("orcamento_id", orcamentoIds);

  // Tabela ainda não migrada: segue com defaults (0 de 6 / EPIs).
  if (error) {
    console.warn("laudos-sst tracking indisponível:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.orcamento_id, row as OrcamentoLaudosSstRecord);
  }
  return map;
}
