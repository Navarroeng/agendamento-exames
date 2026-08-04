"use client";

import {
  formatImplantacaoMesLabel,
  isImplantacaoMesDisponivel,
  isSameYearMonth,
  listImplantacaoMesAbas,
  yearMonthKey,
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
    <div
      className="-mx-1 mb-3 overflow-x-auto px-1"
      role="tablist"
      aria-label="Filtrar processos pelo mês da aprovação"
    >
      <div className="flex w-max min-w-full items-center gap-1.5">
        {abas.map((mes) => {
          const disponivel = isImplantacaoMesDisponivel(mes, now);
          const ativo = isSameYearMonth(mes, selected);
          const label = formatImplantacaoMesLabel(mes);
          const key = yearMonthKey(mes);

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={ativo}
              aria-disabled={!disponivel}
              disabled={!disponivel}
              title={
                disponivel
                  ? `Aprovações de ${label} de ${mes.year}`
                  : `${label} de ${mes.year} ainda não disponível`
              }
              onClick={() => {
                if (!disponivel) return;
                onSelect(mes);
              }}
              className={[
                "shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[11px] font-bold tracking-wide transition",
                ativo
                  ? "border-brand-blue bg-brand-blue text-white shadow-[0_6px_14px_rgba(79,99,255,0.22)]"
                  : disponivel
                    ? "border-brand-blue/20 bg-brand-blue-soft text-brand-blue hover:border-brand-blue/40 hover:bg-[#e4e9ff]"
                    : "cursor-not-allowed border-[#e8edf5] bg-[#f8fafc] text-[#94a3b8] opacity-60",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
