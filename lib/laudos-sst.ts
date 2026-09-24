import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import { labelImplantacaoEtapa } from "@/lib/implantacao-clientes";
import {
  isAetElaboracaoConcluida,
  isAetEnvioConcluido,
  isAetVisitaRealizada,
  type ImplantacaoAetRecord,
} from "@/lib/implantacao-aet";
import {
  copyLaudoPontual,
  isFluxoLaudoPontual,
  resolveLaudoPontualKindFromImplantacao,
  type LaudoPontualKind,
} from "@/lib/servico-laudo-pontual";
import { filterByEtapaEntradaMes } from "@/lib/etapa-entrada";
import { LISTAGEM_MES_VAZIO_MSG, type YearMonth } from "@/lib/listagem-meses";
import { normalizeSearchText } from "@/lib/text-normalize";
import { anexoMetaFromColumns } from "@/lib/laudos-sst-anexos";
import {
  contarEtapasConsecutivasConcluidas,
  EMPTY_LAUDOS_WORKFLOW,
  resolverEtapaAtualLaudos,
  type LaudosSstWorkflow,
} from "@/lib/laudos-sst-etapas";

/** Etapas exclusivas do módulo Laudos SST (ordem fixa). */
export const LAUDOS_SST_ETAPAS = [
  { id: "epis", label: "EPIs" },
  { id: "processo_inicial", label: "Processo inicial" },
  { id: "cronograma_acoes", label: "Cronograma de ações" },
  { id: "pgr_pcmso_ltcat", label: "PGR / PCMSO / LTCAT" },
  { id: "autorizacao_pedro", label: "Autorização Pedro" },
  { id: "envio_cliente", label: "Envio para o cliente" },
] as const;

export type LaudosSstEtapaId = (typeof LAUDOS_SST_ETAPAS)[number]["id"];

export type LaudosSstStatus = "em_andamento" | "concluido";

export const LAUDOS_SST_TOTAL_ETAPAS = LAUDOS_SST_ETAPAS.length;

/** Visita (já feita) + elaboração + envio — acompanhamento em Laudos SST. */
export const LAUDOS_SST_LAUDO_PONTUAL_TOTAL_ETAPAS = 3;

export const LAUDOS_SST_ETAPA_LABELS: Record<LaudosSstEtapaId, string> =
  Object.fromEntries(
    LAUDOS_SST_ETAPAS.map((e) => [e.id, e.label])
  ) as Record<LaudosSstEtapaId, string>;

/** Base visual do badge da coluna Etapa atual (tamanho, fonte e padding). */
export const LAUDOS_SST_ETAPA_BADGE_BASE =
  "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold";

/**
 * Cor do badge pela etapa/status real — não pela posição da linha.
 * "Processo inicial" usa azul (#E8EEFF / #3F51D7);
 * "Cronograma de ações" usa lilás (#F1EDFF / #6D4AFF);
 * as demais etapas em andamento mantêm o indigo atual;
 * Concluído permanece verde.
 */
export function laudosSstEtapaAtualBadgeClass(
  etapaAtual: LaudosSstEtapaId,
  status: LaudosSstStatus
): string {
  if (status === "concluido") {
    return `${LAUDOS_SST_ETAPA_BADGE_BASE} bg-brand-green-soft text-brand-green`;
  }
  if (etapaAtual === "processo_inicial") {
    return `${LAUDOS_SST_ETAPA_BADGE_BASE} bg-[#E8EEFF] text-[#3F51D7]`;
  }
  if (etapaAtual === "cronograma_acoes") {
    return `${LAUDOS_SST_ETAPA_BADGE_BASE} bg-[#F1EDFF] text-[#6D4AFF]`;
  }
  return `${LAUDOS_SST_ETAPA_BADGE_BASE} bg-[#eef2ff] text-[#4338ca]`;
}

export interface OrcamentoLaudosSstRecord {
  orcamento_id: string;
  etapa_atual: LaudosSstEtapaId;
  etapas_concluidas: number;
  status?: LaudosSstStatus | null;
  /** Momento em que o processo entrou em Laudos SST. */
  entrada_em?: string | null;
  concluido_em?: string | null;
  created_at?: string;
  updated_at?: string;
  epi_disponibiliza?: boolean | null;
  cadastro_realizado?: boolean | null;
  cadastro_data?: string | null;
  cronograma_elaborado?: boolean | null;
  cronograma_data?: string | null;
  cronograma_epi_respostas?: Record<string, boolean | null> | null;
  pgr_realizado?: boolean | null;
  pgr_data?: string | null;
  pgr_anexo_path?: string | null;
  pgr_anexo_nome?: string | null;
  pgr_anexo_tipo?: string | null;
  pgr_anexo_tamanho?: number | null;
  pcmso_realizado?: boolean | null;
  pcmso_data?: string | null;
  pcmso_anexo_path?: string | null;
  pcmso_anexo_nome?: string | null;
  pcmso_anexo_tipo?: string | null;
  pcmso_anexo_tamanho?: number | null;
  ltcat_realizado?: boolean | null;
  ltcat_data?: string | null;
  ltcat_anexo_path?: string | null;
  ltcat_anexo_nome?: string | null;
  ltcat_anexo_tipo?: string | null;
  ltcat_anexo_tamanho?: number | null;
  enviado_pedro?: boolean | null;
  enviado_pedro_em?: string | null;
  aprovacao_pedro?: boolean | null;
  aprovacao_pedro_em?: string | null;
  aprovacao_pedro_por?: string | null;
  aprovacao_pedro_por_nome?: string | null;
  enviado_cliente?: boolean | null;
  enviado_cliente_email?: string | null;
  enviado_cliente_data?: string | null;
}

export interface LaudosSstProcesso {
  implantacao: ImplantacaoProcesso;
  etapaAtual: LaudosSstEtapaId;
  etapasConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  status: LaudosSstStatus;
  /** Data de entrada na etapa Laudos SST. */
  dataEntrada: string | null;
  /** Quando o Laudo SST ficou concluído (6/6). */
  concluidoEm: string | null;
  /** Reservado: data de conclusão da implantação. */
  dataConclusaoImplantacao: string | null;
  workflow: LaudosSstWorkflow;
  tracking: OrcamentoLaudosSstRecord | null;
  /** AET / Insalubridade: mesmo `implantacao_aet`, sem tracking PGR. */
  laudoPontualKind: LaudoPontualKind | null;
  /** Rótulo da etapa atual (laudo pontual usa o kind canônico). */
  etapaAtualLabel: string;
}

export interface LaudosSstFilters {
  busca: string;
  responsavel: string;
}

export const EMPTY_LAUDOS_SST_FILTERS: LaudosSstFilters = {
  busca: "",
  responsavel: "",
};

export function isLaudosSstEtapaId(value: string): value is LaudosSstEtapaId {
  return LAUDOS_SST_ETAPAS.some((e) => e.id === value);
}

/**
 * Laudos SST concluído quando a última etapa (Envio para o cliente) está OK:
 * 6 de 6 etapas ou status persistido como concluido.
 */
export function isLaudosSstConcluido(
  tracking: Pick<
    OrcamentoLaudosSstRecord,
    "status" | "etapas_concluidas"
  > | null
): boolean {
  if (!tracking) return false;
  if (tracking.status === "concluido") return true;
  return Number(tracking.etapas_concluidas) >= LAUDOS_SST_TOTAL_ETAPAS;
}

/**
 * Implantação pronta para seguir (concluída ou treinamento agendado),
 * sem cancelamento/encerramento.
 */
export function isImplantacaoProntaParaEncaminhamento(
  processo: ImplantacaoProcesso
): boolean {
  if (
    processo.orcamento.status === "cancelado" ||
    processo.orcamento.status === "contrato_encerrado" ||
    processo.etapaAtual === "contrato_encerrado" ||
    processo.etapaAtual === "treinamento_cancelado"
  ) {
    return false;
  }
  return (
    processo.etapaAtual === "concluido" ||
    processo.etapaAtual === "treinamento_agendado"
  );
}

/**
 * Laudo pontual exclusivo (AET / Insalubridade) entra em Laudos SST
 * quando a Implantação já concluiu na visita realizada.
 * Não cria `orcamento_laudos_sst` (fluxo PGR).
 */
export function isProcessoElegivelLaudoPontualLaudosSst(
  processo: ImplantacaoProcesso
): boolean {
  if (!isFluxoLaudoPontual(processo.fluxoImplantacao)) return false;
  return isImplantacaoProntaParaEncaminhamento(processo);
}

/**
 * Elegível ao encaminhamento automático para Laudos SST (fluxo PGR):
 * implantação pronta E orçamento aprovado com "Pacote completo - SST".
 * PGR/LTCAT/PCMSO avulsos não bastam. Laudo pontual exclusivo não entra aqui.
 */
export function isProcessoElegivelLaudosSst(
  processo: ImplantacaoProcesso
): boolean {
  if (isFluxoLaudoPontual(processo.fluxoImplantacao)) return false;
  if (!isImplantacaoProntaParaEncaminhamento(processo)) return false;
  return Boolean(processo.possuiPacoteCompletoSst);
}

/** Tracking com trabalho real (não só a linha inicial em EPIs). */
export function laudosTrackingTemTrabalhoReal(
  tracking: OrcamentoLaudosSstRecord | null | undefined
): boolean {
  if (!tracking) return false;
  if (tracking.status === "concluido") return true;
  if (Number(tracking.etapas_concluidas) > 0) return true;
  const etapa = (tracking.etapa_atual ?? "").trim();
  if (etapa && etapa !== "epis") return true;
  return workflowTemResposta(mapLaudosWorkflowFromRecord(tracking));
}

/** Lista: Pacote SST, laudo pontual após visita, ou tracking antigo já trabalhado. */
export function isProcessoVisivelLaudosSst(
  processo: ImplantacaoProcesso,
  tracking: OrcamentoLaudosSstRecord | null | undefined
): boolean {
  if (isProcessoElegivelLaudoPontualLaudosSst(processo)) return true;
  if (isProcessoElegivelLaudosSst(processo)) return true;
  if (
    processo.orcamento.status === "cancelado" ||
    processo.orcamento.status === "contrato_encerrado" ||
    processo.etapaAtual === "contrato_encerrado" ||
    processo.etapaAtual === "treinamento_cancelado"
  ) {
    return false;
  }
  return laudosTrackingTemTrabalhoReal(tracking);
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export function mapLaudosWorkflowFromRecord(
  tracking: OrcamentoLaudosSstRecord | null
): LaudosSstWorkflow {
  if (!tracking) return { ...EMPTY_LAUDOS_WORKFLOW };
  return {
    epiDisponibiliza: tracking.epi_disponibiliza ?? null,
    cadastroRealizado: tracking.cadastro_realizado ?? null,
    cadastroData: dateOnly(tracking.cadastro_data),
    cronogramaElaborado: tracking.cronograma_elaborado ?? null,
    cronogramaData: dateOnly(tracking.cronograma_data),
    cronogramaEpiRespostas:
      tracking.cronograma_epi_respostas &&
      typeof tracking.cronograma_epi_respostas === "object"
        ? { ...tracking.cronograma_epi_respostas }
        : {},
    pgrRealizado: tracking.pgr_realizado ?? null,
    pgrData: dateOnly(tracking.pgr_data),
    pgrAnexo: anexoMetaFromColumns(
      tracking.pgr_anexo_path,
      tracking.pgr_anexo_nome,
      tracking.pgr_anexo_tipo,
      tracking.pgr_anexo_tamanho
    ),
    pcmsoRealizado: tracking.pcmso_realizado ?? null,
    pcmsoData: dateOnly(tracking.pcmso_data),
    pcmsoAnexo: anexoMetaFromColumns(
      tracking.pcmso_anexo_path,
      tracking.pcmso_anexo_nome,
      tracking.pcmso_anexo_tipo,
      tracking.pcmso_anexo_tamanho
    ),
    ltcatRealizado: tracking.ltcat_realizado ?? null,
    ltcatData: dateOnly(tracking.ltcat_data),
    ltcatAnexo: anexoMetaFromColumns(
      tracking.ltcat_anexo_path,
      tracking.ltcat_anexo_nome,
      tracking.ltcat_anexo_tipo,
      tracking.ltcat_anexo_tamanho
    ),
    enviadoPedro: tracking.enviado_pedro ?? null,
    enviadoPedroEm: tracking.enviado_pedro_em ?? null,
    aprovacaoPedro: tracking.aprovacao_pedro ?? null,
    aprovacaoPedroEm: tracking.aprovacao_pedro_em ?? null,
    aprovacaoPedroPorNome: tracking.aprovacao_pedro_por_nome ?? null,
    enviadoCliente: tracking.enviado_cliente ?? null,
    enviadoClienteEmail: tracking.enviado_cliente_email ?? null,
    enviadoClienteData: dateOnly(tracking.enviado_cliente_data),
  };
}

function workflowTemResposta(w: LaudosSstWorkflow): boolean {
  return (
    w.epiDisponibiliza !== null ||
    w.cadastroRealizado !== null ||
    w.cronogramaElaborado !== null ||
    w.pgrRealizado !== null ||
    w.pcmsoRealizado !== null ||
    w.ltcatRealizado !== null ||
    w.enviadoPedro !== null ||
    w.aprovacaoPedro !== null ||
    w.enviadoCliente !== null
  );
}

export function labelEtapaAtualLaudosSst(processo: LaudosSstProcesso): string {
  if (processo.status === "concluido") return "Concluído";
  if (processo.etapaAtualLabel) return processo.etapaAtualLabel;
  return LAUDOS_SST_ETAPA_LABELS[processo.etapaAtual];
}

/** Abas operacionais do modal de laudo pontual em Laudos SST. */
export type LaudosPontualTabId = "visita" | "elaboracao" | "envio";

export function buildLaudosPontualEtapas(
  kind: LaudoPontualKind
): Array<{ id: LaudosPontualTabId; label: string }> {
  const copy = copyLaudoPontual(kind);
  return [
    { id: "visita", label: copy.etapaVisita },
    { id: "elaboracao", label: copy.etapaElaboracao },
    { id: "envio", label: copy.etapaEnvio },
  ];
}

export function isLaudosPontualEtapaLiberada(
  etapa: LaudosPontualTabId,
  aet: ImplantacaoAetRecord | null
): boolean {
  if (etapa === "envio") return isAetElaboracaoConcluida(aet);
  return true;
}

export function isLaudosPontualEtapaConcluida(
  etapa: LaudosPontualTabId,
  aet: ImplantacaoAetRecord | null
): boolean {
  if (etapa === "visita") return isAetVisitaRealizada(aet);
  if (etapa === "elaboracao") return isAetElaboracaoConcluida(aet);
  return isAetEnvioConcluido(aet);
}

export function resolveLaudosPontualTabInicial(
  aet: ImplantacaoAetRecord | null
): LaudosPontualTabId {
  if (isAetEnvioConcluido(aet) || isAetElaboracaoConcluida(aet)) {
    return "envio";
  }
  return "elaboracao";
}

export function etapasProgressoLaudosSst(
  processo: LaudosSstProcesso
): Array<{ id: string; label: string }> {
  if (processo.laudoPontualKind) {
    return buildLaudosPontualEtapas(processo.laudoPontualKind);
  }
  return LAUDOS_SST_ETAPAS.map((e) => ({ id: e.id, label: e.label }));
}

function dataEntradaLaudoPontual(
  implantacao: ImplantacaoProcesso
): string | null {
  const aet = implantacao.aet ?? null;
  return (
    aet?.visita_realizada_em ??
    aet?.visita_data ??
    implantacao.dataAprovacao ??
    null
  );
}

function buildLaudosSstProcessoLaudoPontual(
  implantacao: ImplantacaoProcesso
): LaudosSstProcesso {
  const kind =
    resolveLaudoPontualKindFromImplantacao({
      fluxo: implantacao.fluxoImplantacao,
      itens: implantacao.aprovacao?.orcamento_aprovacao_itens,
    }) ?? "aet";
  const aet = implantacao.aet ?? null;
  const visitaOk = isAetVisitaRealizada(aet);
  const elaboracaoOk = isAetElaboracaoConcluida(aet);
  const envioOk = isAetEnvioConcluido(aet);
  let etapasConcluidas = 0;
  if (visitaOk) etapasConcluidas += 1;
  if (elaboracaoOk) etapasConcluidas += 1;
  if (envioOk) etapasConcluidas += 1;
  const totalEtapas = LAUDOS_SST_LAUDO_PONTUAL_TOTAL_ETAPAS;
  const concluido = envioOk;
  const etapaAtual: LaudosSstEtapaId = concluido
    ? "envio_cliente"
    : "processo_inicial";
  const etapaAtualLabel = concluido
    ? "Concluído"
    : elaboracaoOk
      ? "Aguardando envio"
      : labelImplantacaoEtapa("elaboracao", kind);

  return {
    implantacao,
    etapaAtual,
    etapasConcluidas: concluido ? totalEtapas : etapasConcluidas,
    totalEtapas,
    progressoLabel: `${concluido ? totalEtapas : etapasConcluidas} de ${totalEtapas}`,
    status: concluido ? "concluido" : "em_andamento",
    dataEntrada: dataEntradaLaudoPontual(implantacao),
    concluidoEm: concluido ? aet?.enviado_em ?? null : null,
    dataConclusaoImplantacao: aet?.visita_realizada_em ?? aet?.visita_data ?? null,
    workflow: { ...EMPTY_LAUDOS_WORKFLOW },
    tracking: null,
    laudoPontualKind: kind,
    etapaAtualLabel,
  };
}

export function buildLaudosSstProcesso(
  implantacao: ImplantacaoProcesso,
  tracking: OrcamentoLaudosSstRecord | null
): LaudosSstProcesso {
  if (isFluxoLaudoPontual(implantacao.fluxoImplantacao)) {
    return buildLaudosSstProcessoLaudoPontual(implantacao);
  }

  const workflow = mapLaudosWorkflowFromRecord(tracking);
  const ordem = LAUDOS_SST_ETAPAS.map((e) => e.id);
  const computed = contarEtapasConsecutivasConcluidas(workflow, ordem);
  const persisted = Math.min(
    LAUDOS_SST_TOTAL_ETAPAS,
    Math.max(0, Number(tracking?.etapas_concluidas) || 0)
  );
  const etapasConcluidas = workflowTemResposta(workflow) ? computed : persisted;
  const etapaAtual = workflowTemResposta(workflow)
    ? resolverEtapaAtualLaudos(workflow, ordem)
    : tracking && isLaudosSstEtapaId(tracking.etapa_atual)
      ? tracking.etapa_atual
      : "epis";
  const concluido = workflowTemResposta(workflow)
    ? computed >= LAUDOS_SST_TOTAL_ETAPAS
    : isLaudosSstConcluido(
        tracking
          ? { status: tracking.status, etapas_concluidas: persisted }
          : null
      );

  const status: LaudosSstStatus = concluido ? "concluido" : "em_andamento";
  const etapaFinal: LaudosSstEtapaId = concluido ? "envio_cliente" : etapaAtual;

  return {
    implantacao,
    etapaAtual: etapaFinal,
    etapasConcluidas: concluido ? LAUDOS_SST_TOTAL_ETAPAS : etapasConcluidas,
    totalEtapas: LAUDOS_SST_TOTAL_ETAPAS,
    progressoLabel: `${concluido ? LAUDOS_SST_TOTAL_ETAPAS : etapasConcluidas} de ${LAUDOS_SST_TOTAL_ETAPAS}`,
    status,
    dataEntrada: tracking?.entrada_em ?? tracking?.created_at ?? null,
    concluidoEm: concluido ? tracking?.concluido_em ?? null : null,
    dataConclusaoImplantacao: null,
    workflow,
    tracking,
    laudoPontualKind: null,
    etapaAtualLabel: concluido
      ? "Concluído"
      : LAUDOS_SST_ETAPA_LABELS[etapaFinal],
  };
}

export function filterLaudosSstProcessos(
  processos: LaudosSstProcesso[],
  filters: LaudosSstFilters
): LaudosSstProcesso[] {
  const busca = normalizeSearchText(filters.busca);
  const buscaDigits = filters.busca.replace(/\D/g, "");

  return processos.filter((p) => {
    const { orcamento, numeroContrato } = p.implantacao;

    if (
      filters.responsavel &&
      orcamento.responsavel !== filters.responsavel
    ) {
      return false;
    }

    if (!busca && !buscaDigits) return true;

    const haystack = [
      orcamento.numero,
      numeroContrato ?? "",
      orcamento.cliente_nome,
      orcamento.cliente_cnpj ?? "",
      orcamento.responsavel,
      p.status === "concluido"
        ? "Concluído"
        : p.etapaAtualLabel || LAUDOS_SST_ETAPA_LABELS[p.etapaAtual],
    ].join(" ");

    if (busca && normalizeSearchText(haystack).includes(busca)) return true;
    if (
      buscaDigits &&
      (orcamento.cliente_cnpj ?? "").replace(/\D/g, "").includes(buscaDigits)
    ) {
      return true;
    }
    return false;
  });
}

export function filterLaudosSstProcessosPorMes(
  processos: LaudosSstProcesso[],
  mes: YearMonth
): LaudosSstProcesso[] {
  return filterByEtapaEntradaMes(processos, (p) => p.dataEntrada, mes);
}

export const LAUDOS_SST_MES_VAZIO_MSG = LISTAGEM_MES_VAZIO_MSG;

/**
 * Grupos da listagem (não é status persistido):
 * 1 = aberto e já iniciado (além de EPIs)
 * 2 = aberto ainda em EPIs
 * 3 = concluído
 */
export function grupoOrdenacaoLaudosSst(
  processo: Pick<
    LaudosSstProcesso,
    "status" | "etapaAtual" | "etapasConcluidas" | "totalEtapas"
  >
): 1 | 2 | 3 {
  if (
    processo.status === "concluido" ||
    (processo.totalEtapas > 0 &&
      processo.etapasConcluidas >= processo.totalEtapas)
  ) {
    return 3;
  }
  if (processo.etapaAtual === "epis" && processo.etapasConcluidas === 0) {
    return 2;
  }
  return 1;
}

function compareDataEntradaLaudosAsc(
  a: LaudosSstProcesso,
  b: LaudosSstProcesso
): number {
  const da = (a.dataEntrada ?? "").slice(0, 10);
  const db = (b.dataEntrada ?? "").slice(0, 10);
  if (da !== db) {
    if (!da) return 1;
    if (!db) return -1;
    return da.localeCompare(db);
  }
  return a.implantacao.orcamento.numero.localeCompare(
    b.implantacao.orcamento.numero,
    "pt-BR"
  );
}

export function sortLaudosSstProcessos(
  processos: LaudosSstProcesso[]
): LaudosSstProcesso[] {
  return [...processos].sort((a, b) => {
    const ga = grupoOrdenacaoLaudosSst(a);
    const gb = grupoOrdenacaoLaudosSst(b);
    if (ga !== gb) return ga - gb;
    if (ga === 1 && a.etapasConcluidas !== b.etapasConcluidas) {
      return b.etapasConcluidas - a.etapasConcluidas;
    }
    return compareDataEntradaLaudosAsc(a, b);
  });
}
