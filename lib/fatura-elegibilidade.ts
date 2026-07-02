import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";

/** Único status de agendamento elegível para faturamento. */
export const FATURA_STATUS_ELEGIVEL: AgendamentoStatus = "agendado";

export const FATURA_SEM_ELEGIVEIS_MSG =
  "Nenhum agendamento elegível para faturamento encontrado.";

export const FATURA_SEM_AGENDAMENTOS_VALIDOS_REEMISSAO_MSG =
  "Não há agendamentos válidos para reemitir esta fatura.";

export const FATURA_AGENDAMENTO_NAO_ELEGIVEL_MSG =
  "Apenas agendamentos com status agendado podem ser faturados.";

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
  return normalizeAgendamentoStatusForFatura(status) === FATURA_STATUS_ELEGIVEL;
}

export function filterAgendamentosElegiveisFatura(
  agendamentos: AgendamentoWithExames[]
): AgendamentoWithExames[] {
  return agendamentos.filter((ag) => isAgendamentoElegivelFatura(ag.status));
}
