/**
 * Abas mensais da listagem “Processos de implantação”.
 * Configuração centralizada (mês/ano) — fácil estender para 2027+.
 */

import {
  belongsToYearMonth,
  compareYearMonth,
  formatMesLabel,
  getNowYearMonth,
  isMesDisponivel,
  isSameYearMonth,
  listMesAbas,
  resolveInitialMes,
  yearMonthFromIsoDate,
  yearMonthKey,
  type YearMonth,
} from "@/lib/listagem-meses";

export type ImplantacaoYearMonth = YearMonth;

/** Início do intervalo de abas exibido na UI. */
export const IMPLANTACAO_MESES_ABAS_INICIO: ImplantacaoYearMonth = {
  year: 2026,
  month: 7,
};

/** Fim do intervalo de abas exibido na UI. */
export const IMPLANTACAO_MESES_ABAS_FIM: ImplantacaoYearMonth = {
  year: 2026,
  month: 12,
};

export {
  compareYearMonth,
  getNowYearMonth,
  isSameYearMonth,
  yearMonthKey,
};

export function formatImplantacaoMesLabel(mes: ImplantacaoYearMonth): string {
  return formatMesLabel(mes);
}

/** Lista inclusiva de abas entre `from` e `to` (padrão: jul–dez/2026). */
export function listImplantacaoMesAbas(
  from: ImplantacaoYearMonth = IMPLANTACAO_MESES_ABAS_INICIO,
  to: ImplantacaoYearMonth = IMPLANTACAO_MESES_ABAS_FIM
): ImplantacaoYearMonth[] {
  return listMesAbas(from, to);
}

/** Mês futuro (após o mês civil atual) fica desabilitado. Passados e atual liberados. */
export function isImplantacaoMesDisponivel(
  mes: ImplantacaoYearMonth,
  now: Date = new Date()
): boolean {
  return isMesDisponivel(mes, now);
}

/**
 * Aba inicial: mês atual se estiver no intervalo e disponível;
 * senão, o último mês disponível da lista; fallback no primeiro.
 */
export function resolveInitialImplantacaoMes(
  now: Date = new Date(),
  abas: ImplantacaoYearMonth[] = listImplantacaoMesAbas()
): ImplantacaoYearMonth {
  return resolveInitialMes(now, abas);
}

/**
 * Extrai ano/mês da data de aprovação (mesmo critério da coluna:
 * primeiros 10 chars ISO `YYYY-MM-DD`).
 */
export function yearMonthFromDataAprovacao(
  dataAprovacao: string | null | undefined
): ImplantacaoYearMonth | null {
  return yearMonthFromIsoDate(dataAprovacao);
}

export function processoBelongsToMesAprovacao(
  dataAprovacao: string | null | undefined,
  mes: ImplantacaoYearMonth
): boolean {
  return belongsToYearMonth(dataAprovacao, mes);
}

export const IMPLANTACAO_MES_VAZIO_MSG =
  "Nenhum processo de implantação encontrado para este mês.";
