"use client";

import { ListagemMesAnoTabs } from "@/components/ui/ListagemMesAnoTabs";
import {
  ORCAMENTO_MESES_ANO_INICIO,
  ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO,
  type OrcamentoYearMonth,
} from "@/lib/orcamento-meses";

interface OrcamentoMesTabsProps {
  selected: OrcamentoYearMonth;
  onSelect: (mes: OrcamentoYearMonth) => void;
  onYearChange: (year: number) => void;
  now?: Date;
}

export function OrcamentoMesTabs({
  selected,
  onSelect,
  onYearChange,
  now = new Date(),
}: OrcamentoMesTabsProps) {
  return (
    <ListagemMesAnoTabs
      selected={selected}
      onSelect={onSelect}
      onYearChange={onYearChange}
      startYear={ORCAMENTO_MESES_ANO_INICIO}
      startMonthFirstYear={ORCAMENTO_MESES_MES_INICIO_PRIMEIRO_ANO}
      now={now}
      ariaLabel="Filtrar orçamentos pelo mês da data da proposta"
      monthTitlePrefix="Orçamentos de"
    />
  );
}
