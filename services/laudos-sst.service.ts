import { createClient } from "@/lib/supabase/client";
import {
  buildLaudosSstProcesso,
  isLaudosSstConcluido,
  isProcessoElegivelLaudosSst,
  isProcessoVisivelLaudosSst,
  LAUDOS_SST_ETAPAS,
  LAUDOS_SST_TOTAL_ETAPAS,
  sortLaudosSstProcessos,
  type LaudosSstEtapaId,
  type LaudosSstProcesso,
  type OrcamentoLaudosSstRecord,
} from "@/lib/laudos-sst";
import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import { listarProcessosImplantacao } from "@/services/implantacao-clientes.service";
import {
  contarEtapasConsecutivasConcluidas,
  isLaudosEtapaConcluida,
  isPgrPcmsoLtcatDocumentosProntos,
  proximaEtapaLaudos,
  resolverEtapaAtualLaudos,
  type LaudosSstWorkflow,
} from "@/lib/laudos-sst-etapas";

const LAUDOS_TRACKING_SELECT = [
  "orcamento_id",
  "etapa_atual",
  "etapas_concluidas",
  "status",
  "entrada_em",
  "concluido_em",
  "created_at",
  "updated_at",
  "epi_disponibiliza",
  "cadastro_realizado",
  "cadastro_data",
  "cronograma_elaborado",
  "cronograma_data",
  "cronograma_epi_respostas",
  "pgr_realizado",
  "pgr_data",
  "pcmso_realizado",
  "pcmso_data",
  "ltcat_realizado",
  "ltcat_data",
  "enviado_pedro",
  "enviado_pedro_em",
  "aprovacao_pedro",
  "aprovacao_pedro_em",
  "aprovacao_pedro_por",
  "aprovacao_pedro_por_nome",
  "enviado_cliente",
  "enviado_cliente_email",
  "enviado_cliente_data",
].join(", ");

/**
 * Lista processos de Laudos SST.
 * Cria tracking só com Pacote completo - SST; não apaga linhas antigas.
 */
export async function listarProcessosLaudosSst(): Promise<LaudosSstProcesso[]> {
  const implantacao = await listarProcessosImplantacao();
  if (implantacao.length === 0) return [];

  const todosIds = implantacao.map((p) => p.orcamento.id);
  const trackingExistente = await buscarTrackingLaudosSst(todosIds);
  const elegiveis = implantacao.filter(isProcessoElegivelLaudosSst);
  const trackingMap = await garantirTrackingLaudosSst(
    elegiveis,
    trackingExistente
  );
  await sincronizarConclusaoLaudosSst(trackingMap);

  const visiveis = implantacao.filter((p) =>
    isProcessoVisivelLaudosSst(p, trackingMap.get(p.orcamento.id) ?? null)
  );

  const processos = visiveis.map((p) =>
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
    const { data: fallback, error: fallbackError } = await supabase
      .from("orcamento_laudos_sst")
      .select(
        "orcamento_id, etapa_atual, etapas_concluidas, status, entrada_em, concluido_em, created_at, updated_at"
      )
      .in("orcamento_id", orcamentoIds);
    if (fallbackError) {
      console.warn("laudos-sst tracking indisponível:", error.message);
      return map;
    }
    for (const row of (fallback ?? []) as unknown as OrcamentoLaudosSstRecord[]) {
      map.set(row.orcamento_id, row);
    }
    return map;
  }

  for (const row of (data ?? []) as unknown as OrcamentoLaudosSstRecord[]) {
    map.set(row.orcamento_id, row);
  }
  return map;
}

/**
 * Cria tracking ao entrar em Laudos SST, só se for elegível pelo pacote.
 * Não apaga registros existentes.
 */
async function garantirTrackingLaudosSst(
  elegiveis: ImplantacaoProcesso[],
  trackingExistente?: Map<string, OrcamentoLaudosSstRecord>
): Promise<Map<string, OrcamentoLaudosSstRecord>> {
  const ids = elegiveis
    .filter(isProcessoElegivelLaudosSst)
    .map((p) => p.orcamento.id);
  const map =
    trackingExistente ?? (await buscarTrackingLaudosSst(ids));
  const faltantes = elegiveis.filter(
    (p) => isProcessoElegivelLaudosSst(p) && !map.has(p.orcamento.id)
  );
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
      map.set(orcamentoId, inserted as unknown as OrcamentoLaudosSstRecord);
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

function dateOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export interface SalvarLaudosSstEtapaInput {
  orcamentoId: string;
  etapa: LaudosSstEtapaId;
  workflow: LaudosSstWorkflow;
  atual: OrcamentoLaudosSstRecord | null;
  aprovador?: { userId: string | null; nome: string | null };
}

export interface SalvarLaudosSstEtapaResult {
  tracking: OrcamentoLaudosSstRecord;
  etapaConcluida: boolean;
  proximaEtapa: LaudosSstEtapaId | null;
}

export async function salvarEtapaLaudosSst(
  input: SalvarLaudosSstEtapaInput
): Promise<SalvarLaudosSstEtapaResult> {
  const ordem = LAUDOS_SST_ETAPAS.map((e) => e.id);
  const w = input.workflow;
  const agora = new Date().toISOString();
  const atual = input.atual;

  const docsProntos = isPgrPcmsoLtcatDocumentosProntos(w);
  let enviadoPedroEm = atual?.enviado_pedro_em ?? null;
  if (docsProntos && w.enviadoPedro === true && atual?.enviado_pedro !== true) {
    enviadoPedroEm = agora;
  }

  let aprovacaoEm = atual?.aprovacao_pedro_em ?? null;
  let aprovacaoPor = atual?.aprovacao_pedro_por ?? null;
  let aprovacaoNome = atual?.aprovacao_pedro_por_nome ?? null;
  if (w.aprovacaoPedro === true && atual?.aprovacao_pedro !== true) {
    aprovacaoEm = agora;
    aprovacaoPor = input.aprovador?.userId || null;
    aprovacaoNome = input.aprovador?.nome || null;
  }

  const payload = {
    orcamento_id: input.orcamentoId,
    epi_disponibiliza: w.epiDisponibiliza,
    cadastro_realizado: w.cadastroRealizado,
    cadastro_data: dateOrNull(w.cadastroData),
    cronograma_elaborado: w.cronogramaElaborado,
    cronograma_data: dateOrNull(w.cronogramaData),
    cronograma_epi_respostas: w.cronogramaEpiRespostas ?? {},
    pgr_realizado: w.pgrRealizado,
    pgr_data: dateOrNull(w.pgrData),
    pcmso_realizado: w.pcmsoRealizado,
    pcmso_data: dateOrNull(w.pcmsoData),
    ltcat_realizado: w.ltcatRealizado,
    ltcat_data: dateOrNull(w.ltcatData),
    enviado_pedro: w.enviadoPedro,
    enviado_pedro_em: enviadoPedroEm,
    aprovacao_pedro: w.aprovacaoPedro,
    aprovacao_pedro_em: aprovacaoEm,
    aprovacao_pedro_por: aprovacaoPor,
    aprovacao_pedro_por_nome: aprovacaoNome,
    enviado_cliente: w.enviadoCliente,
    enviado_cliente_email: w.enviadoClienteEmail?.trim() || null,
    enviado_cliente_data: dateOrNull(w.enviadoClienteData),
  };

  const merged: LaudosSstWorkflow = {
    ...w,
    enviadoPedroEm,
    aprovacaoPedroEm: aprovacaoEm,
    aprovacaoPedroPorNome: aprovacaoNome,
  };

  const etapasConcluidas = contarEtapasConsecutivasConcluidas(merged, ordem);
  const etapaAtual = resolverEtapaAtualLaudos(merged, ordem);
  const concluido = etapasConcluidas >= LAUDOS_SST_TOTAL_ETAPAS;
  const etapaConcluida = isLaudosEtapaConcluida(input.etapa, merged);

  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_laudos_sst")
    .upsert(
      {
        ...payload,
        etapa_atual: concluido ? "envio_cliente" : etapaAtual,
        etapas_concluidas: etapasConcluidas,
        status: concluido ? "concluido" : "em_andamento",
        concluido_em: concluido ? atual?.concluido_em ?? agora : null,
        entrada_em: atual?.entrada_em ?? agora,
      },
      { onConflict: "orcamento_id" }
    )
    .select(LAUDOS_TRACKING_SELECT)
    .maybeSingle();

  if (error || !data) {
    const msg = error?.message ?? "";
    if (/does not exist|schema cache/i.test(msg)) {
      throw new Error(
        "A estrutura do banco ainda não foi atualizada. Execute a migration 108_laudos_sst_workflow.sql no Supabase."
      );
    }
    throw new Error(msg || "Não foi possível salvar a etapa.");
  }

  return {
    tracking: data as unknown as OrcamentoLaudosSstRecord,
    etapaConcluida,
    proximaEtapa:
      etapaConcluida ? proximaEtapaLaudos(input.etapa, ordem) : null,
  };
}
