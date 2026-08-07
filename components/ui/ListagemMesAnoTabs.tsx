"use client";

import { MesAnoTabs } from "@/components/ui/MesAnoTabs";
import {
  LISTAGEM_ANO_INICIO,
  formatMesLabel,
  listAnosDisponiveis,
  listMesAbasListagem,
  type YearMonth,
} from "@/lib/listagem-meses";

export interface ListagemMesAnoTabsProps {
  selected: YearMonth;
  onSelect: (mes: YearMonth) => void;
  onYearChange: (year: number) => void;
  /** Ano mínimo do seletor (padrão 2026). */
  startYear?: number;
  /**
   * No primeiro ano (`startYear`), abas começam neste mês (1–12).
   * Anos seguintes: janeiro–dezembro.
   */
  startMonthFirstYear?: number;
  now?: Date;
  ariaLabel?: string;
  /** Prefixo do title das abas, ex.: "Orçamentos de". */
  monthTitlePrefix?: string;
  monthTitle?: (mes: YearMonth, disponivel: boolean) => string;
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
  now = new Date(),
  ariaLabel = "Filtrar por mês",
  monthTitlePrefix,
  monthTitle,
}: ListagemMesAnoTabsProps) {
  const years = listAnosDisponiveis(startYear, now);
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
      now={now}
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
