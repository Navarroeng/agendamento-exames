/**
 * Abas mensais da listagem “Processos de implantação”.
 * Filtro pela data de entrada na etapa (= aprovado_em).
 */

import {
  LISTAGEM_MES_VAZIO_MSG,
  belongsToYearMonth,
  compareYearMonth,
  formatMesLabel,
  getNowYearMonth,
  isMesDisponivel,
  isSameYearMonth,
  listAnosDisponiveis,
  listMesAbasListagem,
  resolveInitialMesListagem,
  resolveMesParaAno,
  yearMonthFromIsoDate,
  yearMonthKey,
  type YearMonth,
} from "@/lib/listagem-meses";

export type ImplantacaoYearMonth = YearMonth;

/** Mesmo marco do sistema (julho/2026). */
export const IMPLANTACAO_MESES_ANO_INICIO = 2026;
export const IMPLANTACAO_MESES_MES_INICIO_PRIMEIRO_ANO = 7;

/** @deprecated Use IMPLANTACAO_MESES_ANO_INICIO + listagem anual. */
export const IMPLANTACAO_MESES_ABAS_INICIO: ImplantacaoYearMonth = {
  year: 2026,
  month: 7,
};

/** @deprecated */
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

export function listImplantacaoAnos(now: Date = new Date()): number[] {
  return listAnosDisponiveis(IMPLANTACAO_MESES_ANO_INICIO, now);
}

export function listImplantacaoMesAbas(
  year: number = new Date().getFullYear()
): ImplantacaoYearMonth[] {
  return listMesAbasListagem(year, {
    startYear: IMPLANTACAO_MESES_ANO_INICIO,
    startMonthFirstYear: IMPLANTACAO_MESES_MES_INICIO_PRIMEIRO_ANO,
  });
}

export function isImplantacaoMesDisponivel(
  mes: ImplantacaoYearMonth,
  now: Date = new Date()
): boolean {
  return isMesDisponivel(mes, now);
}

export function resolveInitialImplantacaoMes(
  now: Date = new Date()
): ImplantacaoYearMonth {
  return resolveInitialMesListagem({
    startYear: IMPLANTACAO_MESES_ANO_INICIO,
    startMonthFirstYear: IMPLANTACAO_MESES_MES_INICIO_PRIMEIRO_ANO,
    now,
  });
}

export function resolveImplantacaoMesParaAno(
  year: number,
  preferredMonth: number,
  now: Date = new Date()
): ImplantacaoYearMonth {
  return resolveMesParaAno(year, preferredMonth, {
    startYear: IMPLANTACAO_MESES_ANO_INICIO,
    startMonthFirstYear: IMPLANTACAO_MESES_MES_INICIO_PRIMEIRO_ANO,
    now,
  });
}

/**
 * Extrai ano/mês da data de entrada na Implantação
 * (`aprovado_em` / coluna “Data da aprovação”).
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

export const IMPLANTACAO_MES_VAZIO_MSG = LISTAGEM_MES_VAZIO_MSG;
