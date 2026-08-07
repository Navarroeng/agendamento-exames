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
import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";

const LAUDOS_TRACKING_SELECT =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at";

/**
 * Lista processos elegíveis a Laudos SST a partir da Implantação concluída.
 * Garante tracking com `entrada_em` (data de entrada na etapa).
 */
export async function listarProcessosLaudosSst(): Promise<LaudosSstProcesso[]> {
  const implantacao = await listarProcessosImplantacao();
  const elegiveis = implantacao.filter(isProcessoElegivelLaudosSst);
  if (elegiveis.length === 0) return [];

  const trackingMap = await garantirTrackingLaudosSst(elegiveis);
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
    .select(LAUDOS_TRACKING_SELECT)
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
 * Cria tracking ao entrar em Laudos SST, registrando `entrada_em`.
 */
async function garantirTrackingLaudosSst(
  elegiveis: ImplantacaoProcesso[]
): Promise<Map<string, OrcamentoLaudosSstRecord>> {
  const ids = elegiveis.map((p) => p.orcamento.id);
  const map = await buscarTrackingLaudosSst(ids);
  const faltantes = elegiveis.filter((p) => !map.has(p.orcamento.id));
  if (faltantes.length === 0) return map;

  const supabase = createClient();

  for (const processo of faltantes) {
    const orcamentoId = processo.orcamento.id;
    const entradaEm =
      processo.treinamento?.atualizado_em ??
      processo.treinamento?.criado_em ??
      processo.aprovacao?.updated_at ??
      new Date().toISOString();

    const { data: inserted, error: insertError } = await supabase
      .from("orcamento_laudos_sst")
      .upsert(
        {
          orcamento_id: orcamentoId,
          etapa_atual: "epis",
          etapas_concluidas: 0,
          status: "em_andamento",
          entrada_em: entradaEm,
        },
        { onConflict: "orcamento_id", ignoreDuplicates: true }
      )
      .select(LAUDOS_TRACKING_SELECT)
      .maybeSingle();

    if (insertError) {
      console.warn("falha ao criar tracking Laudos SST:", insertError.message);
      map.set(orcamentoId, {
        orcamento_id: orcamentoId,
        etapa_atual: "epis",
        etapas_concluidas: 0,
        status: "em_andamento",
        entrada_em: entradaEm,
      });
      continue;
    }

    if (inserted) {
      map.set(orcamentoId, inserted as OrcamentoLaudosSstRecord);
    } else {
      map.set(orcamentoId, {
        orcamento_id: orcamentoId,
        etapa_atual: "epis",
        etapas_concluidas: 0,
        status: "em_andamento",
        entrada_em: entradaEm,
      });
    }
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
    (row) => isLaudosSstConcluido(row) && row.status !== "concluido"
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
