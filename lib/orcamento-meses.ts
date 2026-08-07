/**
 * Abas mensais da listagem de Orçamentos (por data_proposta / coluna “Data”).
 */

import {
  LISTAGEM_MES_VAZIO_MSG,
  belongsToYearMonth,
  isMesDisponivel,
  listAnosDisponiveis,
  listMesAbasListagem,
  resolveInitialMesListagem,
  resolveMesParaAno,
  type YearMonth,
} from "@/lib/listagem-meses";
import type { OrcamentoRecord } from "@/lib/orcamento-types";

export type OrcamentoYearMonth = YearMonth;

/** Sistema passou a ser usado em julho/2026 — abas de 2026 começam nesse mês. */
export const ORCAMENTO_MESES_ANO_INICIO = 2026;
export const ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO = 7;

export const ORCAMENTO_MES_VAZIO_MSG = LISTAGEM_MES_VAZIO_MSG;

/** Anos do seletor: 2026 … ano civil atual. */
export function listOrcamentoAnos(now: Date = new Date()): number[] {
  return listAnosDisponiveis(ORCAMENTO_MESES_ANO_INICIO, now);
}

/**
 * Abas do ano:
 * - 2026 → julho–dezembro
 * - demais anos → janeiro–dezembro
 */
export function listOrcamentoMesAbas(year: number): OrcamentoYearMonth[] {
  return listMesAbasListagem(year, {
    startYear: ORCAMENTO_MESES_ANO_INICIO,
    startMonthFirstYear: ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO,
  });
}

export function resolveInitialOrcamentoMes(
  now: Date = new Date()
): OrcamentoYearMonth {
  return resolveInitialMesListagem({
    startYear: ORCAMENTO_MESES_ANO_INICIO,
    startMonthFirstYear: ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO,
    now,
  });
}

/**
 * Ao trocar o ano, mantém o mês se ainda for válido/disponível;
 * senão escolhe o melhor mês disponível daquele ano.
 */
export function resolveOrcamentoMesParaAno(
  year: number,
  preferredMonth: number,
  now: Date = new Date()
): OrcamentoYearMonth {
  return resolveMesParaAno(year, preferredMonth, {
    startYear: ORCAMENTO_MESES_ANO_INICIO,
    startMonthFirstYear: ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO,
    now,
  });
}

export function orcamentoBelongsToMes(
  orcamento: Pick<OrcamentoRecord, "data_proposta">,
  mes: OrcamentoYearMonth
): boolean {
  return belongsToYearMonth(orcamento.data_proposta, mes);
}

/** Filtra pela data oficial do orçamento (`data_proposta` / coluna “Data”). */
export function filterOrcamentosPorMes(
  orcamentos: OrcamentoRecord[],
  mes: OrcamentoYearMonth
): OrcamentoRecord[] {
  return orcamentos.filter((o) => orcamentoBelongsToMes(o, mes));
}

// re-export used by tests
export { isMesDisponivel };
