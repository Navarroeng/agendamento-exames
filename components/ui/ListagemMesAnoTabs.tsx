"use client";

import type { ReactNode } from "react";
import { MesAnoTabs } from "@/components/ui/MesAnoTabs";
import {
  LISTAGEM_ANO_INICIO,
  formatMesLabel,
  listAnosDisponiveis,
  listMesAbasListagem,
  type ListagemPeriodoSelecionado,
  type YearMonth,
} from "@/lib/listagem-meses";

export interface ListagemMesAnoTabsProps {
  selected: ListagemPeriodoSelecionado;
  onSelect: (mes: YearMonth) => void;
  onYearChange: (year: number) => void;
  /** Ano mínimo do seletor (padrão 2026). */
  startYear?: number;
  /**
   * No primeiro ano (`startYear`), abas começam neste mês (1–12).
   * Anos seguintes: janeiro–dezembro.
   */
  startMonthFirstYear?: number;
  /**
   * Quando informado, substitui a faixa fixa startYear→ano atual
   * (ex.: anos derivados dos registros de Periódicos Futuros).
   */
  years?: number[];
  /**
   * Quando false, meses futuros ficam habilitados.
   * Padrão true (comportamento Orçamentos / Implantação).
   */
  disableFutureMonths?: boolean;
  now?: Date;
  ariaLabel?: string;
  /** Prefixo do title das abas, ex.: "Orçamentos de". */
  monthTitlePrefix?: string;
  monthTitle?: (mes: YearMonth, disponivel: boolean) => string;
  /** Extra na mesma linha do seletor de ano (não altera o filtro mês/ano). */
  yearRowExtra?: ReactNode;
  /**
   * Aba "Todos" antes de Janeiro (ausência do filtro mensal no ano).
   * Usar só em Periódicos Futuros.
   */
  showAllMonthsTab?: boolean;
  onSelectTodos?: () => void;
  todosTitle?: string;
}

/**
 * Filtro reutilizável Ano + abas mensais (padrão Orçamentos / Implantação).
 * Usar em todas as listagens operacionais por período.
 */
export function ListagemMesAnoTabs({
  selected,
  onSelect,
  onYearChange,
  startYear = LISTAGEM_ANO_INICIO,
  startMonthFirstYear = 1,
  years: yearsProp,
  disableFutureMonths = true,
  now = new Date(),
  ariaLabel = "Filtrar por mês",
  monthTitlePrefix,
  monthTitle,
  yearRowExtra,
  showAllMonthsTab = false,
  onSelectTodos,
  todosTitle,
}: ListagemMesAnoTabsProps) {
  const years = yearsProp ?? listAnosDisponiveis(startYear, now);
  const months = listMesAbasListagem(selected.year, {
    startYear,
    startMonthFirstYear,
  });

  return (
    <MesAnoTabs
      months={months}
      selected={selected}
      onSelect={onSelect}
      year={selected.year}
      years={years}
      onYearChange={onYearChange}
      yearRowExtra={yearRowExtra}
      now={now}
      disableFutureMonths={disableFutureMonths}
      showAllMonthsTab={showAllMonthsTab}
      onSelectTodos={onSelectTodos}
      todosTitle={todosTitle}
      ariaLabel={ariaLabel}
      monthTitle={
        monthTitle ??
        ((mes, disponivel) => {
          const label = formatMesLabel(mes);
          if (!disponivel) {
            return `${label} de ${mes.year} ainda não disponível`;
          }
          if (monthTitlePrefix) {
            return `${monthTitlePrefix} ${label} de ${mes.year}`;
          }
          return `${label} de ${mes.year}`;
        })
      }
    />
  );
}
