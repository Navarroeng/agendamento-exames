"use client";

import { MesAnoTabs } from "@/components/ui/MesAnoTabs";
import {
  formatImplantacaoMesLabel,
  listImplantacaoMesAbas,
  type ImplantacaoYearMonth,
} from "@/lib/implantacao-meses";

interface ImplantacaoMesTabsProps {
  selected: ImplantacaoYearMonth;
  onSelect: (mes: ImplantacaoYearMonth) => void;
  now?: Date;
}

export function ImplantacaoMesTabs({
  selected,
  onSelect,
  now = new Date(),
}: ImplantacaoMesTabsProps) {
  const abas = listImplantacaoMesAbas();

  return (
    <MesAnoTabs
      months={abas}
      selected={selected}
      onSelect={onSelect}
      now={now}
      ariaLabel="Filtrar processos pelo mês da aprovação"
      monthTitle={(mes, disponivel) => {
        const label = formatImplantacaoMesLabel(mes);
        return disponivel
          ? `Aprovações de ${label} de ${mes.year}`
          : `${label} de ${mes.year} ainda não disponível`;
      }}
    />
  );
}
