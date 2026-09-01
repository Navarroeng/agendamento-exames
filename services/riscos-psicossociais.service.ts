import { createClient } from "@/lib/supabase/client";
import { buildLaudosSstProcesso } from "@/lib/laudos-sst";
import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import {
  buildRiscosProcessoManualCliente,
  buildRiscosPsicossociaisProcesso,
  isProcessoElegivelRiscosPsicossociais,
  isProcessoVisivelRiscosAutomatico,
  sortRiscosPsicossociaisProcessos,
  type OrcamentoRiscosPsicossociaisRecord,
  type RiscosPsicossociaisProcesso,
} from "@/lib/riscos-psicossociais";
import { deveInserirTrackingRiscosNoSincronismo } from "@/lib/riscos-processo-cancelamento";
import { isOrigemManualCliente } from "@/lib/riscos-campanha-origem";
import {
  listarCampanhasManuaisAtivas,
  listarCampanhasPorOrcamentos,
} from "@/services/riscos-campanha.service";
import { buscarFluxoCampanha } from "@/services/riscos-lista-presenca.service";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";
import { buscarTrackingLaudosSst } from "@/services/laudos-sst.service";

const RISCOS_TRACKING_SELECT =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por, cancelado_em, cancelado_por, motivo_cancelamento";

const RISCOS_TRACKING_SELECT_SEM_CANCELAMENTO =
  "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at, lista_solicitada, lista_solicitada_em, lista_solicitada_email, lista_solicitada_por, lista_solicitada_registrado_em, lista_recebida, lista_anexo_path, lista_anexo_nome, lista_anexo_tipo, lista_anexo_tamanho, lista_recebida_em, lista_recebida_por";

/**
 * Lista processos de Riscos Psicossociais:
 * - automático: Implantação pronta + Pacote completo - SST;
 * - tracking antigo com trabalho real (não apaga, só exibe);
 * - inclusões manuais pelo cadastro do cliente.
 * Não chama listarProcessosLaudosSst — não cria tracking de Laudos.
 */
export async function listarProcessosRiscosPsicossociais(): Promise<
  RiscosPsicossociaisProcesso[]
> {
  const implantacao = await listarProcessosImplantacao();
  const ids = implantacao.map((p) => p.orcamento.id);
  const [laudosTracking, riscosMap, campanhasMap] = await Promise.all([
    buscarTrackingLaudosSst(ids),
    garantirTrackingRiscosPsicossociais(implantacao),
    listarCampanhasPorOrcamentos(ids),
  ]);

  const visiveis = implantacao.filter((p) =>
    isProcessoVisivelRiscosAutomatico(
      p,
      riscosMap.get(p.orcamento.id) ?? null,
      campanhasMap.has(p.orcamento.id)
    )
  );

  const manuais = await listarCampanhasManuaisAtivas();
  const campanhaIds = [
    ...Array.from(campanhasMap.values()).map((c) => c.id),
    ...manuais.map((c) => c.id),
  ];
  const participantesPorCampanha =
    await listarStatusParticipantesPorCampanhas(campanhaIds);
  const relatoriosMap = await listarRelatoriosMetaPorCampanhas(campanhaIds);

  const processosNormais = visiveis.map((processo) => {
    const orcamentoId = processo.orcamento.id;
    const campanha = campanhasMap.get(orcamentoId) ?? null;
    const relMeta = campanha ? relatoriosMap.get(campanha.id) : undefined;
    const laudos = buildLaudosSstProcesso(
      processo,
      laudosTracking.get(orcamentoId) ?? null
    );
    return buildRiscosPsicossociaisProcesso(
      laudos,
      riscosMap.get(orcamentoId) ?? null,
      campanha,
      {
        participantes: campanha
          ? participantesPorCampanha.get(campanha.id) ?? []
          : [],
        relatorioGerado: campanha ? Boolean(relMeta) : false,
        relatorioGeradoEm: relMeta?.gerado_em ?? null,
        relatorioEnviadoEm: relMeta?.relatorio_enviado_em ?? null,
      }
    );
  });

  const processosManuais: RiscosPsicossociaisProcesso[] = [];
  for (const campanha of manuais) {
    if (!isOrigemManualCliente(campanha.origem)) continue;
    const fluxo = await buscarFluxoCampanha(campanha.id);
    processosManuais.push(
      buildRiscosProcessoManualCliente({
        campanha,
        tracking: fluxo,
        participantes: participantesPorCampanha.get(campanha.id) ?? [],
        relatorioGerado: Boolean(relatoriosMap.get(campanha.id)),
        relatorioGeradoEm: relatoriosMap.get(campanha.id)?.gerado_em ?? null,
        relatorioEnviadoEm:
          relatoriosMap.get(campanha.id)?.relatorio_enviado_em ?? null,
      })
    );
  }

  return sortRiscosPsicossociaisProcessos([
    ...processosNormais,
    ...processosManuais,
  ]);
}

/** Status ativos por campanha (exclui removidos) — base do progresso. */
async function listarStatusParticipantesPorCampanhas(
  campanhaIds: string[]
): Promise<Map<string, Array<{ status: string }>>> {
  const map = new Map<string, Array<{ status: string }>>();
  const ids = Array.from(new Set(campanhaIds.filter(Boolean)));
  if (ids.length === 0) return map;

  const supabase = createClient();
  let { data, error } = await supabase
    .from("riscos_campanha_participantes")
    .select("campanha_id, status, removido_em")
    .in("campanha_id", ids);

  if (error && /removido_em/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("riscos_campanha_participantes")
      .select("campanha_id, status")
      .in("campanha_id", ids)
      .neq("status", "removido");
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return map;
    }
    console.warn(
      "riscos participantes (progresso) indisponível:",
      error.message
    );
    return map;
  }

  for (const row of data ?? []) {
    const campanhaId = String(
      (row as { campanha_id?: string }).campanha_id ?? ""
    );
    if (!campanhaId) continue;
    const status = String((row as { status?: string }).status ?? "pendente");
    const removidoEm = (row as { removido_em?: string | null }).removido_em;
    if (status === "removido" || removidoEm) continue;
    const list = map.get(campanhaId) ?? [];
    list.push({ status });
    map.set(campanhaId, list);
  }

  return map;
}

/** Metadados de relatório final por campanha (listagem). */
async function listarRelatoriosMetaPorCampanhas(
  campanhaIds: string[]
): Promise<
  Map<string, { gerado_em: string; relatorio_enviado_em: string | null }>
> {
  const map = new Map<
    string,
    { gerado_em: string; relatorio_enviado_em: string | null }
  >();
  const ids = Array.from(new Set(campanhaIds.filter(Boolean)));
  if (ids.length === 0) return map;

  const supabase = createClient();
  let { data, error } = await supabase
    .from("riscos_relatorios")
    .select("campanha_id, gerado_em, relatorio_enviado_em")
    .in("campanha_id", ids);

  if (
    error &&
    (/relatorio_enviado_em/i.test(error.message ?? "") ||
      error.code === "42703")
  ) {
    const fb = await supabase
      .from("riscos_relatorios")
      .select("campanha_id, gerado_em")
      .in("campanha_id", ids);
    data = fb.data as typeof data;
    error = fb.error;
  }

  if (error) {
    if (error.code === "42P01" || error.message?.includes("does not exist")) {
      return map;
    }
    console.warn("riscos_relatorios (listagem) indisponível:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    const cid = String((row as { campanha_id?: string }).campanha_id ?? "");
    if (!cid) continue;
    map.set(cid, {
      gerado_em: String((row as { gerado_em?: string }).gerado_em ?? ""),
      relatorio_enviado_em: (row as { relatorio_enviado_em?: string | null })
        .relatorio_enviado_em
        ? String(
            (row as { relatorio_enviado_em: string }).relatorio_enviado_em
          )
        : null,
    });
  }
  return map;
}

async function garantirTrackingRiscosPsicossociais(
  implantacao: ImplantacaoProcesso[]
): Promise<Map<string, OrcamentoRiscosPsicossociaisRecord>> {
  const map = new Map<string, OrcamentoRiscosPsicossociaisRecord>();
  const ids = implantacao.map((p) => p.orcamento.id);
  if (ids.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_riscos_psicossociais")
    .select(RISCOS_TRACKING_SELECT)
    .in("orcamento_id", ids);

  const trackingError =
    error &&
    /cancelado_em|cancelado_por|motivo_cancelamento/i.test(error.message ?? "")
      ? (
          await supabase
            .from("orcamento_riscos_psicossociais")
            .select(RISCOS_TRACKING_SELECT_SEM_CANCELAMENTO)
            .in("orcamento_id", ids)
        )
      : { data, error };

  if (trackingError.error) {
    console.warn(
      "riscos-psicossociais tracking indisponível:",
      trackingError.error.message
    );
    return map;
  }

  for (const row of trackingError.data ?? []) {
    map.set(row.orcamento_id, row as OrcamentoRiscosPsicossociaisRecord);
  }

  const faltantes = implantacao.filter((p) =>
    deveInserirTrackingRiscosNoSincronismo(
      isProcessoElegivelRiscosPsicossociais(p),
      map.get(p.orcamento.id) ?? null
    )
  );

  for (const processo of faltantes) {
    const orcamentoId = processo.orcamento.id;
    const entradaEm =
      processo.treinamento?.atualizado_em ??
      processo.treinamento?.criado_em ??
      processo.aprovacao?.updated_at ??
      new Date().toISOString();
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
