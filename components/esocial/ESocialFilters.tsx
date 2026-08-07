"use client";

import { maskDateBR } from "@/lib/agendamento-datetime";
import {
  ESOCIAL_STATUS_OPTIONS,
  hasActiveESocialFilters,
  type ESocialFilters,
} from "@/lib/esocial-filters";
import type { ClienteFilterOption } from "@/lib/cliente-display";

interface ESocialFiltersProps {
  filters: ESocialFilters;
  options: {
    clientes: ClienteFilterOption[];
    colaboradores: string[];
  };
  totalFiltrados: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (field: keyof ESocialFilters, value: string) => void;
  onClear: () => void;
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass = "field-input field-input-compact w-full text-sm";

export function ESocialFiltersPanel({
  filters,
  options,
  totalFiltrados,
  expanded,
  onToggle,
  onChange,
  onClear,
}: ESocialFiltersProps) {
  const hasFilters = hasActiveESocialFilters(filters);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8edf5]/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#fafbff]"
        aria-expanded={expanded}
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-brand-blue/15 bg-gradient-to-br from-brand-blue-soft/90 to-white text-brand-blue">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            aria-hidden
          >
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy">Filtros</p>
          <p className="text-[11px] text-[#64748b]">
            {totalFiltrados} agendamento
            {totalFiltrados !== 1 ? "s" : ""} no filtro
          </p>
        </div>
        {hasFilters && (
          <span
            role="button"
            tabIndex={0}
            className="shrink-0 text-[11px] font-semibold text-brand-blue hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                onClear();
              }
            }}
          >
            Limpar
          </span>
        )}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`shrink-0 text-[#64748b] transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-[#eef2f7] px-4 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <FilterField label="Empresa / Cliente">
              <input
                className={inputClass}
                list="esocial-clientes"
                placeholder="Buscar empresa..."
                value={filters.cliente}
                onChange={(e) => onChange("cliente", e.target.value)}
              />
              <datalist id="esocial-clientes">
                {options.clientes.map((c) => (
                  <option key={c.value} value={c.value} label={c.label} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Colaborador">
              <input
                className={inputClass}
                list="esocial-colaboradores"
                placeholder="Buscar colaborador..."
                value={filters.colaborador}
                onChange={(e) => onChange("colaborador", e.target.value)}
              />
              <datalist id="esocial-colaboradores">
                {options.colaboradores.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Status e-Social">
              <select
                className={inputClass}
                value={filters.statusEsocial}
                onChange={(e) =>
                  onChange(
                    "statusEsocial",
                    e.target.value as ESocialFilters["statusEsocial"]
                  )
                }
              >
                {ESOCIAL_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Data início">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                value={filters.dataInicio}
                onChange={(e) =>
                  onChange("dataInicio", maskDateBR(e.target.value))
                }
              />
            </FilterField>

            <FilterField label="Data fim">
              <input
                className={inputClass}
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/AAAA"
                maxLength={10}
                value={filters.dataFim}
                onChange={(e) =>
                  onChange("dataFim", maskDateBR(e.target.value))
                }
              />
            </FilterField>
          </div>
        </div>
      )}
    </div>
  );
}
