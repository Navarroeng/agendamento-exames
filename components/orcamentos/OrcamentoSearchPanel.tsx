"use client";

import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import {
  ORCAMENTO_STATUS_OPTIONS,
  type OrcamentoFilters,
} from "@/lib/orcamento-types";
import { hasActiveOrcamentoFilters } from "@/lib/orcamento-filters";

interface OrcamentoSearchPanelProps {
  filters: OrcamentoFilters;
  totalFiltrados: number;
  onChange: (field: keyof OrcamentoFilters, value: string) => void;
  onClear: () => void;
}

const inputClass = "field-input field-input-compact w-full text-sm";

export function OrcamentoSearchPanel({
  filters,
  totalFiltrados,
  onChange,
  onClear,
}: OrcamentoSearchPanelProps) {
  const hasFilters = hasActiveOrcamentoFilters(filters);

  return (
    <Panel title="Pesquisa" icon={<IconFilter />} iconTone="blue">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748b]">
          {totalFiltrados} orçamento
          {totalFiltrados !== 1 ? "s" : ""} encontrado
          {totalFiltrados !== 1 ? "s" : ""}
        </p>
        {hasFilters && (
          <button
            type="button"
            className="text-[11px] font-semibold text-brand-blue hover:underline"
            onClick={onClear}
          >
            Limpar pesquisa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Buscar
          </label>
          <input
            className={inputClass}
            placeholder="Número, cliente, contato, responsável..."
            value={filters.busca}
            onChange={(e) => onChange("busca", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Status
          </label>
          <select
            className={inputClass}
            value={filters.status}
            onChange={(e) => onChange("status", e.target.value)}
          >
            <option value="">Todos</option>
            {ORCAMENTO_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Panel>
  );
}
