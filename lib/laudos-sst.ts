import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import { normalizeSearchText } from "@/lib/text-normalize";

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

export interface OrcamentoLaudosSstRecord {
  orcamento_id: string;
  etapa_atual: LaudosSstEtapaId;
  etapas_concluidas: number;
  status?: LaudosSstStatus | null;
  concluido_em?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LaudosSstProcesso {
  implantacao: ImplantacaoProcesso;
  etapaAtual: LaudosSstEtapaId;
  etapasConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  status: LaudosSstStatus;
  /** Quando o Laudo SST ficou concluído (6/6). */
  concluidoEm: string | null;
  /** Reservado: data de conclusão da implantação. */
  dataConclusaoImplantacao: string | null;
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
 * Mesmo critério do filtro "Concluídos" da Implantação:
 * etapa calculada concluído ou treinamento agendado.
 */
export function isProcessoElegivelLaudosSst(
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

export function buildLaudosSstProcesso(
  implantacao: ImplantacaoProcesso,
  tracking: OrcamentoLaudosSstRecord | null
): LaudosSstProcesso {
  const etapaAtual =
    tracking && isLaudosSstEtapaId(tracking.etapa_atual)
      ? tracking.etapa_atual
      : "epis";
  const etapasConcluidas = Math.min(
    LAUDOS_SST_TOTAL_ETAPAS,
    Math.max(0, Number(tracking?.etapas_concluidas) || 0)
  );
  const concluido = isLaudosSstConcluido(
    tracking
      ? { status: tracking.status, etapas_concluidas: etapasConcluidas }
      : null
  );

  return {
    implantacao,
    etapaAtual: concluido ? "envio_cliente" : etapaAtual,
    etapasConcluidas: concluido ? LAUDOS_SST_TOTAL_ETAPAS : etapasConcluidas,
    totalEtapas: LAUDOS_SST_TOTAL_ETAPAS,
    progressoLabel: `${concluido ? LAUDOS_SST_TOTAL_ETAPAS : etapasConcluidas} de ${LAUDOS_SST_TOTAL_ETAPAS}`,
    status: concluido ? "concluido" : "em_andamento",
    concluidoEm: concluido ? tracking?.concluido_em ?? null : null,
    dataConclusaoImplantacao: null,
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

export function sortLaudosSstProcessos(
  processos: LaudosSstProcesso[]
): LaudosSstProcesso[] {
  return [...processos].sort((a, b) => {
    const da = a.implantacao.dataAprovacao ?? "";
    const db = b.implantacao.dataAprovacao ?? "";
    if (da !== db) return db.localeCompare(da);
    return a.implantacao.orcamento.numero.localeCompare(
      b.implantacao.orcamento.numero,
      "pt-BR"
    );
  });
}
