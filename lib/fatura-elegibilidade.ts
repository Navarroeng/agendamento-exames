import type { AgendamentoWithExames } from "@/lib/types";

/** Status de agendamento elegíveis para faturamento (exame realizado / cobrável). */
export const FATURA_STATUS_ELEGIVEIS = ["agendado", "aso_retido"] as const;

export type FaturaStatusElegivel = (typeof FATURA_STATUS_ELEGIVEIS)[number];

/** @deprecated Use FATURA_STATUS_ELEGIVEIS */
export const FATURA_STATUS_ELEGIVEL: FaturaStatusElegivel = "agendado";

/** Valor mínimo (R$) para o exame entrar no faturamento. */
export const FATURA_VALOR_MINIMO = 1;

export const FATURA_SEM_ELEGIVEIS_MSG =
  "Nenhum agendamento elegível para faturamento encontrado.";

export const FATURA_SEM_VALOR_COMPETENCIA_MSG =
  "Não há valores a faturar para este cliente nesta competência.";

export const FATURA_SEM_AGENDAMENTOS_VALIDOS_REEMISSAO_MSG =
  "Não há agendamentos válidos para reemitir esta fatura.";

export const FATURA_AGENDAMENTO_NAO_ELEGIVEL_MSG =
  "Apenas agendamentos com status agendado ou ASO Retido podem ser faturados.";

export const FATURA_VALOR_MINIMO_OBS =
  "Exames com valor inferior a R$ 1,00 ou com status Cancelado não serão incluídos no faturamento.";

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

/**
 * Regra única de exame faturável (Faturas Clientes e demais cálculos).
 * TRUE somente quando valor >= R$ 1,00, status ≠ Cancelado e
 * (em Faturas Clientes) o exame não estiver coberto pelo crédito contratual.
 * Custos Clínicas não devem passar `inclusoCreditoContrato`.
 */
export function isExameFaturavel(params: {
  status: string | null | undefined;
  valor: number | null | undefined;
  inclusoCreditoContrato?: boolean | null;
}): boolean {
  if (params.inclusoCreditoContrato === true) return false;
  if (normalizeAgendamentoStatusForFatura(params.status) === "cancelado") {
    return false;
  }
  const valor = Number(params.valor);
  if (!Number.isFinite(valor)) return false;
  return valor >= FATURA_VALOR_MINIMO;
}

/** Competência / referência entra na listagem operacional só com total faturável. */
export function isValorTotalFaturavel(valorTotal: number): boolean {
  const total = Number(valorTotal);
  if (!Number.isFinite(total)) return false;
  return total >= FATURA_VALOR_MINIMO;
}

export function filterAgendamentosElegiveisFatura(
  agendamentos: AgendamentoWithExames[]
): AgendamentoWithExames[] {
  return agendamentos.filter((ag) => isAgendamentoElegivelFatura(ag.status));
}
