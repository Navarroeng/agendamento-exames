import { createClient } from "@/lib/supabase/client";
import {
  buildLaudosSstProcesso,
  isLaudosSstConcluido,
  isProcessoElegivelLaudosSst,
} from "@/lib/laudos-sst";
import {
  buildRiscosPsicossociaisProcesso,
  sortRiscosPsicossociaisProcessos,
  type OrcamentoRiscosPsicossociaisRecord,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";
import { buscarTrackingLaudosSst } from "@/services/laudos-sst.service";

/**
 * Lista processos de Riscos Psicossociais a partir de Laudos SST concluídos.
 * Não duplica cliente/orçamento/contrato.
 */
export async function listarProcessosRiscosPsicossociais(): Promise<
  RiscosPsicossociaisProcesso[]
> {
  const implantacao = await listarProcessosImplantacao();
  const elegiveisLaudos = implantacao.filter(isProcessoElegivelLaudosSst);
  if (elegiveisLaudos.length === 0) return [];

  const ids = elegiveisLaudos.map((p) => p.orcamento.id);
  const laudosTracking = await buscarTrackingLaudosSst(ids);

  const laudosConcluidos = elegiveisLaudos
    .map((p) => {
      const tracking = laudosTracking.get(p.orcamento.id) ?? null;
      if (!isLaudosSstConcluido(tracking)) return null;
      return buildLaudosSstProcesso(p, tracking);
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  if (laudosConcluidos.length === 0) return [];

  const riscosMap = await garantirTrackingRiscosPsicossociais(laudosConcluidos);

  const processos = laudosConcluidos.map((laudos) =>
    buildRiscosPsicossociaisProcesso(
      laudos,
      riscosMap.get(laudos.implantacao.orcamento.id) ?? null
    )
  );

  return sortRiscosPsicossociaisProcessos(processos);
}

async function garantirTrackingRiscosPsicossociais(
  laudosConcluidos: ReturnType<typeof buildLaudosSstProcesso>[]
): Promise<Map<string, OrcamentoRiscosPsicossociaisRecord>> {
  const map = new Map<string, OrcamentoRiscosPsicossociaisRecord>();
  const ids = laudosConcluidos.map((p) => p.implantacao.orcamento.id);
  if (ids.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .select(
      "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at"
    )
    .in("orcamento_id", ids);

  if (error) {
    console.warn("riscos-psicossociais tracking indisponível:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.orcamento_id, row as OrcamentoRiscosPsicossociaisRecord);
  }

  const faltantes = laudosConcluidos.filter(
    (p) => !map.has(p.implantacao.orcamento.id)
  );

  for (const laudos of faltantes) {
    const orcamentoId = laudos.implantacao.orcamento.id;
    const entradaEm = laudos.concluidoEm ?? new Date().toISOString();
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
      .select(
        "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at"
      )
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
