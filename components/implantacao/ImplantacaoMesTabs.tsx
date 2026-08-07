"use client";

import { ListagemMesAnoTabs } from "@/components/ui/ListagemMesAnoTabs";
import {
  IMPLANTACAO_MESES_ANO_INICIO,
  IMPLANTACAO_MESES_MES_INICIO_PRIMEIRO_ANO,
  type ImplantacaoYearMonth,
} from "@/lib/implantacao-meses";

interface ImplantacaoMesTabsProps {
  selected: ImplantacaoYearMonth;
  onSelect: (mes: ImplantacaoYearMonth) => void;
  onYearChange: (year: number) => void;
  now?: Date;
}

export function ImplantacaoMesTabs({
  selected,
  onSelect,
  onYearChange,
  now = new Date(),
}: ImplantacaoMesTabsProps) {
  return (
    <ListagemMesAnoTabs
      selected={selected}
      onSelect={onSelect}
      onYearChange={onYearChange}
      startYear={IMPLANTACAO_MESES_ANO_INICIO}
      startMonthFirstYear={IMPLANTACAO_MESES_MES_INICIO_PRIMEIRO_ANO}
      now={now}
      ariaLabel="Filtrar processos pelo mês de entrada na Implantação"
      monthTitlePrefix="Entradas em Implantação de"
    />
  );
}
