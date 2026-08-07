"use client";

import {
  formatMesLabel,
  isMesDisponivel,
  isSameYearMonth,
  yearMonthKey,
  type YearMonth,
} from "@/lib/listagem-meses";

interface MesAnoTabsProps {
  months: YearMonth[];
  selected: YearMonth;
  onSelect: (mes: YearMonth) => void;
  /** Quando informado com onYearChange, exibe o seletor de ano. */
  year?: number;
  years?: number[];
  onYearChange?: (year: number) => void;
  now?: Date;
  /**
   * Quando false, meses futuros permanecem clicáveis
   * (ex.: Periódicos Futuros com próxima data à frente).
   * Padrão true (Orçamentos / Implantação).
   */
  disableFutureMonths?: boolean;
  ariaLabel?: string;
  monthTitle?: (mes: YearMonth, disponivel: boolean) => string;
}

export function MesAnoTabs({
  months,
  selected,
  onSelect,
  year,
  years,
  onYearChange,
  now = new Date(),
  disableFutureMonths = true,
  ariaLabel = "Filtrar por mês",
  monthTitle,
}: MesAnoTabsProps) {
  const showYear = Boolean(years && onYearChange && year != null);

  return (
    <div className="-mx-1 mb-3 space-y-2.5 px-1">
      {showYear ? (
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="listagem-mes-ano"
            className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]"
          >
            Ano
          </label>
          <select
            id="listagem-mes-ano"
            className="field-input field-input-compact w-[110px] text-sm"
            value={year}
            onChange={(e) => onYearChange?.(Number(e.target.value))}
            aria-label="Selecionar ano"
          >
            {years!.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="overflow-x-auto" role="tablist" aria-label={ariaLabel}>
        <div className="flex w-max min-w-full items-center gap-1.5">
          {months.map((mes) => {
            const disponivel = disableFutureMonths
              ? isMesDisponivel(mes, now)
              : true;
            const ativo = isSameYearMonth(mes, selected);
            const label = formatMesLabel(mes);
            const key = yearMonthKey(mes);
            const title =
              monthTitle?.(mes, disponivel) ??
              (disponivel
                ? `${label} de ${mes.year}`
                : `${label} de ${mes.year} ainda não disponível`);

            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={ativo}
                aria-disabled={!disponivel}
                disabled={!disponivel}
                title={title}
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
    </div>
  );
}
