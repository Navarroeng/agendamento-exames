"use client";

import { MesAnoTabs } from "@/components/ui/MesAnoTabs";
import {
  listOrcamentoAnos,
  listOrcamentoMesAbas,
  type OrcamentoYearMonth,
} from "@/lib/orcamento-meses";
import { formatMesLabel } from "@/lib/listagem-meses";

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
  const years = listOrcamentoAnos(now);
  const months = listOrcamentoMesAbas(selected.year);

  return (
    <MesAnoTabs
      months={months}
      selected={selected}
      onSelect={onSelect}
      year={selected.year}
      years={years}
      onYearChange={onYearChange}
      now={now}
      ariaLabel="Filtrar orçamentos pelo mês da data da proposta"
      monthTitle={(mes, disponivel) => {
        const label = formatMesLabel(mes);
        return disponivel
          ? `Orçamentos de ${label} de ${mes.year}`
          : `${label} de ${mes.year} ainda não disponível`;
      }}
    />
  );
}
