import { createClient } from "@/lib/supabase/client";
import {
  buildLaudosSstProcesso,
  isLaudosSstConcluido,
  isProcessoElegivelLaudosSst,
  LAUDOS_SST_TOTAL_ETAPAS,
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
  await sincronizarConclusaoLaudosSst(trackingMap);

  const processos = elegiveis.map((p) =>
    buildLaudosSstProcesso(p, trackingMap.get(p.orcamento.id) ?? null)
  );

  return sortLaudosSstProcessos(processos);
}

export async function buscarTrackingLaudosSst(
  orcamentoIds: string[]
): Promise<Map<string, OrcamentoLaudosSstRecord>> {
  const map = new Map<string, OrcamentoLaudosSstRecord>();
  if (orcamentoIds.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_laudos_sst")
    .select(
      "orcamento_id, etapa_atual, etapas_concluidas, status, concluido_em, created_at, updated_at"
    )
    .in("orcamento_id", orcamentoIds);

  if (error) {
    console.warn("laudos-sst tracking indisponível:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.orcamento_id, row as OrcamentoLaudosSstRecord);
  }
  return map;
}

/**
 * Se etapas_concluidas >= 6 e status ainda não é concluido, persiste a conclusão.
 * Isso habilita a entrada automática em Riscos Psicossociais.
 */
async function sincronizarConclusaoLaudosSst(
  trackingMap: Map<string, OrcamentoLaudosSstRecord>
): Promise<void> {
  const pendentes = Array.from(trackingMap.values()).filter(
    (row) =>
      isLaudosSstConcluido(row) &&
      row.status !== "concluido"
  );
  if (pendentes.length === 0) return;

  const supabase = createClient();
  const now = new Date().toISOString();

  for (const row of pendentes) {
    const { error } = await supabase
      .from("orcamento_laudos_sst")
      .update({
        status: "concluido",
        etapa_atual: "envio_cliente",
        etapas_concluidas: LAUDOS_SST_TOTAL_ETAPAS,
        concluido_em: row.concluido_em ?? now,
      })
      .eq("orcamento_id", row.orcamento_id);

    if (error) {
      console.warn(
        "falha ao sincronizar conclusão Laudos SST:",
        error.message
      );
      continue;
    }

    trackingMap.set(row.orcamento_id, {
      ...row,
      status: "concluido",
      etapa_atual: "envio_cliente",
      etapas_concluidas: LAUDOS_SST_TOTAL_ETAPAS,
      concluido_em: row.concluido_em ?? now,
    });
  }
}
