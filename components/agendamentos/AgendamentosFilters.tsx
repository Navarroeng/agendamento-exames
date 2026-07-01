"use client";

import { PENDENCIA_LABELS } from "@/lib/agendamentos-table";
import {
  ESOCIAL_FILTER_OPTIONS,
  hasActiveFilters,
  PENDENCIA_SITUACAO_OPTIONS,
  type AgendamentoFilters,
} from "@/lib/agendamento-filters";
import { MonthReferenceSelect } from "@/components/ui/MonthReferenceSelect";
import type { ClienteFilterOption } from "@/lib/cliente-display";

interface FilterOptions {
  clientes: ClienteFilterOption[];
  colaboradores: string[];
  clinicas: string[];
  asos: string[];
  tiposExame: string[];
  responsaveis: string[];
}

interface AgendamentosFiltersProps {
  filters: AgendamentoFilters;
  options: FilterOptions;
  totalFiltrados: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (field: keyof AgendamentoFilters, value: string) => void;
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

const inputClass = "field-input field-input-compact text-sm";

export function AgendamentosFilters({
  filters,
  options,
  totalFiltrados,
  expanded,
  onToggle,
  onChange,
  onClear,
}: AgendamentosFiltersProps) {
  const hasFilters = hasActiveFilters(filters);
  const showClear = expanded || hasFilters;

  const countLabel = `${totalFiltrados} agendamento${totalFiltrados !== 1 ? "s" : ""} encontrado${totalFiltrados !== 1 ? "s" : ""}`;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-[#e8edf5]/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.04),0_1px_2px_rgba(15,23,42,0.02)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-90"
          aria-expanded={expanded}
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-brand-blue/15 bg-gradient-to-br from-brand-blue-soft/90 to-white text-brand-blue shadow-[0_2px_10px_rgba(79,99,255,0.08)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-navy">
              Pesquisar histórico
            </span>
            <span className="mt-0.5 block text-xs text-[#94a3b8]">
              {countLabel}
            </span>
          </span>
        </button>

        {showClear && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="shrink-0 rounded-[8px] border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#52617a] transition-colors hover:border-[#cbd5e1] hover:bg-[#f8fafc]"
          >
            Limpar filtros
          </button>
        )}

        <button
          type="button"
          onClick={onToggle}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] transition-colors hover:border-[#cbd5e1] hover:bg-white"
          aria-label={expanded ? "Recolher filtros" : "Abrir filtros"}
          title={expanded ? "Recolher filtros" : "Abrir filtros"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-[#eef2f7] px-4 pb-4 pt-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <FilterField label="Mês de referência">
              <MonthReferenceSelect
                className={inputClass}
                value={filters.mesReferencia}
                onChange={(value) => onChange("mesReferencia", value)}
              />
            </FilterField>

            <FilterField label="Empresa (cliente)">
              <input
                className={inputClass}
                list="filtro-clientes"
                placeholder="Buscar cliente..."
                value={filters.cliente}
                onChange={(e) => onChange("cliente", e.target.value)}
              />
              <datalist id="filtro-clientes">
                {options.clientes.map((c) => (
                  <option key={c.value} value={c.value} label={c.label} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Colaborador">
              <input
                className={inputClass}
                list="filtro-colaboradores"
                placeholder="Buscar colaborador..."
                value={filters.colaborador}
                onChange={(e) => onChange("colaborador", e.target.value)}
              />
              <datalist id="filtro-colaboradores">
                {options.colaboradores.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Clínica">
              <input
                className={inputClass}
                list="filtro-clinicas"
                placeholder="Buscar clínica..."
                value={filters.clinica}
                onChange={(e) => onChange("clinica", e.target.value)}
              />
              <datalist id="filtro-clinicas">
                {options.clinicas.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Tipo de exame">
              <input
                className={inputClass}
                list="filtro-exames"
                placeholder="Ex.: Clínico..."
                value={filters.tipoExame}
                onChange={(e) => onChange("tipoExame", e.target.value)}
              />
              <datalist id="filtro-exames">
                {options.tiposExame.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Tipo de ASO">
              <input
                className={inputClass}
                list="filtro-aso"
                placeholder="Ex.: Admissional..."
                value={filters.aso}
                onChange={(e) => onChange("aso", e.target.value)}
              />
              <datalist id="filtro-aso">
                {options.asos.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Status">
              <select
                className={inputClass}
                value={filters.status}
                onChange={(e) => onChange("status", e.target.value)}
              >
                <option value="">Todos</option>
                <option value="agendado">Agendado</option>
                <option value="rascunho">Rascunho</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </FilterField>

            <FilterField label="Responsável">
              <input
                className={inputClass}
                list="filtro-responsaveis"
                placeholder="Buscar responsável..."
                value={filters.responsavel}
                onChange={(e) => onChange("responsavel", e.target.value)}
              />
              <datalist id="filtro-responsaveis">
                {options.responsaveis.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </FilterField>

            <FilterField label="Pendência">
              <select
                className={inputClass}
                value={filters.pendencia}
                onChange={(e) => onChange("pendencia", e.target.value)}
              >
                <option value="">Todas</option>
                {PENDENCIA_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Situação da pendência">
              <select
                className={inputClass}
                value={filters.pendenciaSituacao}
                onChange={(e) => onChange("pendenciaSituacao", e.target.value)}
              >
                {PENDENCIA_SITUACAO_OPTIONS.map((opt) => (
                  <option key={opt.value || "todas"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FilterField>

            <FilterField label="e-Social">
              <select
                className={inputClass}
                value={filters.esocial}
                onChange={(e) => onChange("esocial", e.target.value)}
              >
                {ESOCIAL_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.value || "todos"} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </FilterField>
          </div>
        </div>
      )}
    </div>
  );
}
