import type { AgendamentoWithExames } from "@/lib/types";

/** Status de agendamento elegíveis para faturamento (exame realizado / cobrável). */
export const FATURA_STATUS_ELEGIVEIS = ["agendado", "aso_retido"] as const;

export type FaturaStatusElegivel = (typeof FATURA_STATUS_ELEGIVEIS)[number];

/** @deprecated Use FATURA_STATUS_ELEGIVEIS */
export const FATURA_STATUS_ELEGIVEL: FaturaStatusElegivel = "agendado";

export const FATURA_SEM_ELEGIVEIS_MSG =
  "Nenhum agendamento elegível para faturamento encontrado.";

export const FATURA_SEM_AGENDAMENTOS_VALIDOS_REEMISSAO_MSG =
  "Não há agendamentos válidos para reemitir esta fatura.";

export const FATURA_AGENDAMENTO_NAO_ELEGIVEL_MSG =
  "Apenas agendamentos com status agendado ou ASO Retido podem ser faturados.";

/**
 * Faturamento usa APENAS o status do agendamento.
 * Pendências operacionais (ASO, eSocial etc.) são ignoradas por completo.
 */
export function normalizeAgendamentoStatusForFatura(
  status: string | null | undefined
): string {
  return (status ?? "").trim().toLowerCase();
}

export function isAgendamentoElegivelFatura(
  status: string | null | undefined
): boolean {
  const normalized = normalizeAgendamentoStatusForFatura(status);
  return (FATURA_STATUS_ELEGIVEIS as readonly string[]).includes(normalized);
}

export function filterAgendamentosElegiveisFatura(
  agendamentos: AgendamentoWithExames[]
): AgendamentoWithExames[] {
  return agendamentos.filter((ag) => isAgendamentoElegivelFatura(ag.status));
}
