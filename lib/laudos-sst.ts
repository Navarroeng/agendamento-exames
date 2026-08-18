import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import { filterByEtapaEntradaMes } from "@/lib/etapa-entrada";
import { LISTAGEM_MES_VAZIO_MSG, type YearMonth } from "@/lib/listagem-meses";
import { normalizeSearchText } from "@/lib/text-normalize";
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
  pcmso_realizado?: boolean | null;
  pcmso_data?: string | null;
  ltcat_realizado?: boolean | null;
  ltcat_data?: string | null;
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
 * Elegível ao encaminhamento automático para Laudos SST:
 * implantação pronta E orçamento aprovado com "Pacote completo - SST".
 * PGR/LTCAT/PCMSO avulsos não bastam.
 */
export function isProcessoElegivelLaudosSst(
  processo: ImplantacaoProcesso
): boolean {
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

/** Lista automática: elegível pelo pacote, ou tracking antigo já trabalhado. */
export function isProcessoVisivelLaudosSst(
  processo: ImplantacaoProcesso,
  tracking: OrcamentoLaudosSstRecord | null | undefined
): boolean {
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
    pcmsoRealizado: tracking.pcmso_realizado ?? null,
    pcmsoData: dateOnly(tracking.pcmso_data),
    ltcatRealizado: tracking.ltcat_realizado ?? null,
    ltcatData: dateOnly(tracking.ltcat_data),
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

export function buildLaudosSstProcesso(
  implantacao: ImplantacaoProcesso,
  tracking: OrcamentoLaudosSstRecord | null
): LaudosSstProcesso {
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

  return {
    implantacao,
    etapaAtual: concluido ? "envio_cliente" : etapaAtual,
    etapasConcluidas: concluido ? LAUDOS_SST_TOTAL_ETAPAS : etapasConcluidas,
    totalEtapas: LAUDOS_SST_TOTAL_ETAPAS,
    progressoLabel: `${concluido ? LAUDOS_SST_TOTAL_ETAPAS : etapasConcluidas} de ${LAUDOS_SST_TOTAL_ETAPAS}`,
    status: concluido ? "concluido" : "em_andamento",
    dataEntrada: tracking?.entrada_em ?? tracking?.created_at ?? null,
    concluidoEm: concluido ? tracking?.concluido_em ?? null : null,
    dataConclusaoImplantacao: null,
    workflow,
    tracking,
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
        : LAUDOS_SST_ETAPA_LABELS[p.etapaAtual],
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
