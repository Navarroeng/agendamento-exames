/**
 * Abas mensais da listagem de Orçamentos (por data_proposta / coluna “Data”).
 */

import {
  belongsToYearMonth,
  isMesDisponivel,
  listAnosDisponiveis,
  listMesAbasDoAno,
  resolveInitialMes,
  type YearMonth,
} from "@/lib/listagem-meses";
import type { OrcamentoRecord } from "@/lib/orcamento-types";

export type OrcamentoYearMonth = YearMonth;

/** Sistema passou a ser usado em julho/2026 — abas de 2026 começam nesse mês. */
export const ORCAMENTO_MESES_ANO_INICIO = 2026;
export const ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO = 7;

export const ORCAMENTO_MES_VAZIO_MSG =
  "Nenhum orçamento encontrado para este período.";

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
  const startMonth =
    year === ORCAMENTO_MESES_ANO_INICIO
      ? ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO
      : 1;
  return listMesAbasDoAno(year, startMonth);
}

export function resolveInitialOrcamentoMes(
  now: Date = new Date()
): OrcamentoYearMonth {
  const year = now.getFullYear();
  const anos = listOrcamentoAnos(now);
  const selectedYear = anos.includes(year)
    ? year
    : anos[anos.length - 1] ?? ORCAMENTO_MESES_ANO_INICIO;
  return resolveInitialMes(now, listOrcamentoMesAbas(selectedYear));
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
  const abas = listOrcamentoMesAbas(year);
  if (abas.length === 0) {
    return { year, month: preferredMonth };
  }

  const preferred = abas.find((a) => a.month === preferredMonth);
  if (preferred && isMesDisponivel(preferred, now)) {
    return preferred;
  }

  return resolveInitialMes(now, abas);
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
