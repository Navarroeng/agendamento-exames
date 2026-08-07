/**
 * Riscos Psicossociais — fluxo pós-Implantação.
 *
 * Entrada: mesma elegibilidade de Laudos SST (Implantação concluída).
 * A 1ª aba "Laudos SST" é automática e deriva do status real de Laudos SST
 * (não é persistida em campo próprio para evitar divergência).
 */

import type { ImplantacaoProcesso } from "@/lib/implantacao-clientes";
import {
  isLaudosSstConcluido,
  isProcessoElegivelLaudosSst,
  type LaudosSstProcesso,
  type OrcamentoLaudosSstRecord,
} from "@/lib/laudos-sst";
import { filterByEtapaEntradaMes } from "@/lib/etapa-entrada";
import { LISTAGEM_MES_VAZIO_MSG, type YearMonth } from "@/lib/listagem-meses";
import { normalizeSearchText } from "@/lib/text-normalize";

/** Etapas manuais (persistidas em orcamento_riscos_psicossociais.etapa_atual). */
export const RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS = [
  { id: "lista_presenca", label: "Lista de presença" },
  { id: "cadastro_empresa", label: "Cadastro da empresa" },
  { id: "envio_qr_code", label: "Envio do QR Code" },
  { id: "preenchimento_finalizado", label: "Preenchimento finalizado" },
  { id: "laudo_elaborado", label: "Laudo elaborado" },
  { id: "enviado_cliente", label: "Enviado para o cliente" },
] as const;

export type RiscosPsicossociaisEtapaManualId =
  (typeof RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS)[number]["id"];

/** Sequência completa na UI (inclui etapa automática dependente de Laudos SST). */
export const RISCOS_PSICOSSOCIAIS_ETAPAS = [
  {
    id: "laudos_sst",
    label: "Laudos SST",
    automatica: true as const,
  },
  ...RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS.map((e) => ({
    ...e,
    automatica: false as const,
  })),
] as const;

export type RiscosPsicossociaisEtapaId =
  (typeof RISCOS_PSICOSSOCIAIS_ETAPAS)[number]["id"];

export type RiscosPsicossociaisStatus = "em_andamento" | "concluido";

export const RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS =
  RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS.length;

/** Total exibido (1 automática + 6 manuais). */
export const RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS =
  RISCOS_PSICOSSOCIAIS_ETAPAS.length;

export const RISCOS_PSICOSSOCIAIS_ETAPA_LABELS: Record<
  RiscosPsicossociaisEtapaId,
  string
> = Object.fromEntries(
  RISCOS_PSICOSSOCIAIS_ETAPAS.map((e) => [e.id, e.label])
) as Record<RiscosPsicossociaisEtapaId, string>;

/** Tracking persistido: apenas etapas manuais (0–6). */
export interface OrcamentoRiscosPsicossociaisRecord {
  orcamento_id: string;
  etapa_atual: RiscosPsicossociaisEtapaManualId;
  etapas_concluidas: number;
  status?: RiscosPsicossociaisStatus | null;
  entrada_em?: string | null;
  concluido_em?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RiscosPsicossociaisProcesso {
  implantacao: ImplantacaoProcesso;
  laudos: LaudosSstProcesso;
  etapaAtual: RiscosPsicossociaisEtapaId;
  /** Progresso total exibido (0–7), incluindo a etapa automática. */
  etapasConcluidas: number;
  /** Etapas manuais concluídas persistidas (0–6). */
  etapasManuaisConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  status: RiscosPsicossociaisStatus;
  /** Se a aba automática Laudos SST está concluída (derivado do módulo Laudos). */
  laudosSstConcluido: boolean;
  /**
   * Data de entrada em Riscos (= entrada simultânea com Laudos, na conclusão
   * da Implantação). Não muda quando Laudos é concluído depois.
   */
  dataEntrada: string | null;
}

export interface RiscosPsicossociaisFilters {
  busca: string;
  responsavel: string;
}

export const EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS: RiscosPsicossociaisFilters = {
  busca: "",
  responsavel: "",
};

export function isRiscosPsicossociaisEtapaManualId(
  value: string
): value is RiscosPsicossociaisEtapaManualId {
  return RISCOS_PSICOSSOCIAIS_ETAPAS_MANUAIS.some((e) => e.id === value);
}

export function isRiscosPsicossociaisEtapaId(
  value: string
): value is RiscosPsicossociaisEtapaId {
  return RISCOS_PSICOSSOCIAIS_ETAPAS.some((e) => e.id === value);
}

export function isRiscosEtapaAutomatica(
  etapaId: RiscosPsicossociaisEtapaId
): boolean {
  return etapaId === "laudos_sst";
}

/**
 * Elegível a Riscos desde a Implantação concluída
 * (mesmo critério de entrada em Laudos SST).
 */
export function isProcessoElegivelRiscosPsicossociais(
  implantacao: ImplantacaoProcesso
): boolean {
  return isProcessoElegivelLaudosSst(implantacao);
}

/** @deprecated Use isProcessoElegivelRiscosPsicossociais(implantacao). */
export function isProcessoElegivelRiscosPsicossociaisPorLaudos(
  laudos: LaudosSstProcesso,
  trackingLaudos: OrcamentoLaudosSstRecord | null
): boolean {
  if (laudos.status === "concluido") return true;
  return isLaudosSstConcluido(trackingLaudos);
}

/** Etapas manuais só liberam após Laudos SST concluído. */
export function isRiscosEtapaLiberada(
  processo: Pick<RiscosPsicossociaisProcesso, "laudosSstConcluido">,
  etapaId: RiscosPsicossociaisEtapaId
): boolean {
  if (etapaId === "laudos_sst") return true;
  return processo.laudosSstConcluido;
}

export function buildRiscosPsicossociaisProcesso(
  laudos: LaudosSstProcesso,
  tracking: OrcamentoRiscosPsicossociaisRecord | null
): RiscosPsicossociaisProcesso {
  const laudosSstConcluido = laudos.status === "concluido";

  const etapasManuaisConcluidas = Math.min(
    RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS,
    Math.max(0, Number(tracking?.etapas_concluidas) || 0)
  );

  const etapasConcluidas =
    (laudosSstConcluido ? 1 : 0) + etapasManuaisConcluidas;

  const manuaisConcluidasTodas =
    etapasManuaisConcluidas >= RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS;
  const concluido =
    laudosSstConcluido &&
    (tracking?.status === "concluido" || manuaisConcluidasTodas);

  let etapaAtual: RiscosPsicossociaisEtapaId;
  if (!laudosSstConcluido) {
    etapaAtual = "laudos_sst";
  } else if (concluido) {
    etapaAtual = "enviado_cliente";
  } else if (
    tracking &&
    isRiscosPsicossociaisEtapaManualId(tracking.etapa_atual)
  ) {
    etapaAtual = tracking.etapa_atual;
  } else {
    etapaAtual = "lista_presenca";
  }

  return {
    implantacao: laudos.implantacao,
    laudos,
    etapaAtual,
    etapasConcluidas: concluido
      ? RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS
      : etapasConcluidas,
    etapasManuaisConcluidas: concluido
      ? RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS_MANUAIS
      : etapasManuaisConcluidas,
    totalEtapas: RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS,
    progressoLabel: `${
      concluido ? RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS : etapasConcluidas
    } de ${RISCOS_PSICOSSOCIAIS_TOTAL_ETAPAS}`,
    status: concluido ? "concluido" : "em_andamento",
    laudosSstConcluido,
    dataEntrada:
      tracking?.entrada_em ?? laudos.dataEntrada ?? null,
  };
}

export function filterRiscosPsicossociaisProcessos(
  processos: RiscosPsicossociaisProcesso[],
  filters: RiscosPsicossociaisFilters
): RiscosPsicossociaisProcesso[] {
  const busca = normalizeSearchText(filters.busca);
  const buscaDigits = filters.busca.replace(/\D/g, "");

  return processos.filter((p) => {
    const { orcamento } = p.implantacao;

    if (
      filters.responsavel &&
      orcamento.responsavel !== filters.responsavel
    ) {
      return false;
    }

    if (!busca && !buscaDigits) return true;

    const haystack = [
      orcamento.numero,
      p.implantacao.numeroContrato ?? "",
      orcamento.cliente_nome,
      orcamento.cliente_cnpj ?? "",
      orcamento.responsavel,
      p.status === "concluido"
        ? "Concluído"
        : RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[p.etapaAtual],
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

export function filterRiscosPsicossociaisProcessosPorMes(
  processos: RiscosPsicossociaisProcesso[],
  mes: YearMonth
): RiscosPsicossociaisProcesso[] {
  return filterByEtapaEntradaMes(processos, (p) => p.dataEntrada, mes);
}

export const RISCOS_PSICOSSOCIAIS_MES_VAZIO_MSG = LISTAGEM_MES_VAZIO_MSG;

export function sortRiscosPsicossociaisProcessos(
  processos: RiscosPsicossociaisProcesso[]
): RiscosPsicossociaisProcesso[] {
  return [...processos].sort((a, b) => {
    const da = a.dataEntrada ?? "";
    const db = b.dataEntrada ?? "";
    if (da !== db) return db.localeCompare(da);
    return a.implantacao.orcamento.numero.localeCompare(
      b.implantacao.orcamento.numero,
      "pt-BR"
    );
  });
}
