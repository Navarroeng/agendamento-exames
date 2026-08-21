"use client";

import type { ReactNode } from "react";
import {
  formatMesLabel,
  isMesDisponivel,
  isPeriodoTodosMeses,
  isSameYearMonth,
  yearMonthKey,
  type ListagemPeriodoSelecionado,
  type YearMonth,
} from "@/lib/listagem-meses";

interface MesAnoTabsProps {
  months: YearMonth[];
  selected: ListagemPeriodoSelecionado;
  onSelect: (mes: YearMonth) => void;
  /** Quando informado com onYearChange, exibe o seletor de ano. */
  year?: number;
  years?: number[];
  onYearChange?: (year: number) => void;
  /** Conteúdo extra na mesma linha do seletor de ano (ex.: filtro de status). */
  yearRowExtra?: ReactNode;
  now?: Date;
  /**
   * Quando false, meses futuros permanecem clicáveis
   * (ex.: Periódicos Futuros com próxima data à frente).
   * Padrão true (Orçamentos / Implantação).
   */
  disableFutureMonths?: boolean;
  ariaLabel?: string;
  monthTitle?: (mes: YearMonth, disponivel: boolean) => string;
  /**
   * Aba "Todos" à esquerda de Janeiro: ausência do filtro mensal no ano.
   * Só Periódicos Futuros deve ligar isto.
   */
  showAllMonthsTab?: boolean;
  onSelectTodos?: () => void;
  todosTitle?: string;
}

export function MesAnoTabs({
  months,
  selected,
  onSelect,
  year,
  years,
  onYearChange,
  yearRowExtra,
  now = new Date(),
  disableFutureMonths = true,
  ariaLabel = "Filtrar por mês",
  monthTitle,
  showAllMonthsTab = false,
  onSelectTodos,
  todosTitle,
}: MesAnoTabsProps) {
  const showYear = Boolean(years && onYearChange && year != null);
  const todosAtivo = showAllMonthsTab && isPeriodoTodosMeses(selected);

  return (
    <div className="-mx-1 mb-3 space-y-2.5 px-1">
      {showYear || yearRowExtra ? (
        <div className="flex flex-wrap items-center gap-4">
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
          {yearRowExtra}
        </div>
      ) : null}

      <div className="overflow-x-auto" role="tablist" aria-label={ariaLabel}>
        <div className="flex w-max min-w-full items-center gap-1.5">
          {showAllMonthsTab ? (
            <button
              type="button"
              role="tab"
              aria-selected={todosAtivo}
              title={
                todosTitle ??
                `Todos os meses de ${selected.year}`
              }
              onClick={() => onSelectTodos?.()}
              className={[
                "shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[11px] font-bold tracking-wide transition",
                todosAtivo
                  ? "border-brand-blue bg-brand-blue text-white shadow-[0_6px_14px_rgba(79,99,255,0.22)]"
                  : "border-brand-blue/20 bg-brand-blue-soft text-brand-blue hover:border-brand-blue/40 hover:bg-[#e4e9ff]",
              ].join(" ")}
            >
              Todos
            </button>
          ) : null}
          {months.map((mes) => {
            const disponivel = disableFutureMonths
              ? isMesDisponivel(mes, now)
              : true;
            const ativo =
              !todosAtivo &&
              selected.month != null &&
              isSameYearMonth(mes, {
                year: selected.year,
                month: selected.month,
              });
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
