import { createClient } from "@/lib/supabase/client";
import type { LaudosSstProcesso } from "@/lib/laudos-sst";
import {
  buildRiscosPsicossociaisProcesso,
  sortRiscosPsicossociaisProcessos,
  type OrcamentoRiscosPsicossociaisRecord,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import { listarProcessosLaudosSst } from "@/services/laudos-sst.service";

const RISCOS_TRACKING_SELECT =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at";

/**
 * Lista processos de Riscos Psicossociais a partir da Implantação concluída
 * (mesmo conjunto de Laudos SST — entrada simultânea).
 * Não duplica cliente/orçamento/contrato.
 */
export async function listarProcessosRiscosPsicossociais(): Promise<
  RiscosPsicossociaisProcesso[]
> {
  const laudosProcessos = await listarProcessosLaudosSst();
  if (laudosProcessos.length === 0) return [];

  const riscosMap = await garantirTrackingRiscosPsicossociais(laudosProcessos);

  const processos = laudosProcessos.map((laudos) =>
    buildRiscosPsicossociaisProcesso(
      laudos,
      riscosMap.get(laudos.implantacao.orcamento.id) ?? null
    )
  );

  return sortRiscosPsicossociaisProcessos(processos);
}

async function garantirTrackingRiscosPsicossociais(
  laudosProcessos: LaudosSstProcesso[]
): Promise<Map<string, OrcamentoRiscosPsicossociaisRecord>> {
  const map = new Map<string, OrcamentoRiscosPsicossociaisRecord>();
  const ids = laudosProcessos.map((p) => p.implantacao.orcamento.id);
  if (ids.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .select(RISCOS_TRACKING_SELECT)
    .in("orcamento_id", ids);

  if (error) {
    console.warn("riscos-psicossociais tracking indisponível:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.orcamento_id, row as OrcamentoRiscosPsicossociaisRecord);
  }

  const faltantes = laudosProcessos.filter(
    (p) => !map.has(p.implantacao.orcamento.id)
  );

  for (const laudos of faltantes) {
    const orcamentoId = laudos.implantacao.orcamento.id;
    // Entrada simultânea com Laudos (conclusão da Implantação) — não usar concluidoEm.
    const entradaEm = laudos.dataEntrada ?? new Date().toISOString();
    const { data: inserted, error: insertError } = await supabase
      .from("orcamento_riscos_psicossociais")
      .upsert(
        {
          orcamento_id: orcamentoId,
          etapa_atual: "lista_presenca",
          etapas_concluidas: 0,
          status: "em_andamento",
          entrada_em: entradaEm,
        },
        { onConflict: "orcamento_id", ignoreDuplicates: true }
      )
      .select(RISCOS_TRACKING_SELECT)
      .maybeSingle();

    if (insertError) {
      console.warn(
        "falha ao criar tracking Riscos Psicossociais:",
        insertError.message
      );
      map.set(orcamentoId, {
        orcamento_id: orcamentoId,
        etapa_atual: "lista_presenca",
        etapas_concluidas: 0,
        status: "em_andamento",
        entrada_em: entradaEm,
      });
      continue;
    }

    if (inserted) {
      map.set(orcamentoId, inserted as OrcamentoRiscosPsicossociaisRecord);
    } else {
      map.set(orcamentoId, {
        orcamento_id: orcamentoId,
        etapa_atual: "lista_presenca",
        etapas_concluidas: 0,
        status: "em_andamento",
        entrada_em: entradaEm,
      });
    }
  }

  return map;
}
