"use client";

import { MonthReferenceSelect } from "@/components/ui/MonthReferenceSelect";
import { HISTORICO_STATUS_FILTER_LABELS_CLINICA } from "@/lib/custos-clinicas-conferencia";
import type { FaturaHistoricoFilters } from "@/lib/fatura-filters";
import type { FaturaTipo } from "@/lib/types";

interface FaturasHistoricoFiltersProps {
  fixedTipo?: FaturaTipo;
  filters: FaturaHistoricoFilters;
  totalFiltradas: number;
  totalGeral: number;
  disabled?: boolean;
  onChange: (field: keyof FaturaHistoricoFilters, value: string) => void;
  onClear: () => void;
}

const selectClass = "field-input field-input-compact w-full text-sm";

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

const REFERENCIA_LABEL: Record<FaturaTipo, string> = {
  cliente: "Cliente",
  clinica: "Clínica",
};

export function FaturasHistoricoFilters({
  fixedTipo,
  filters,
  totalFiltradas,
  totalGeral,
  disabled = false,
  onChange,
  onClear,
}: FaturasHistoricoFiltersProps) {
  const hasFilters = Object.entries(filters).some(([key, value]) => {
    if (fixedTipo && key === "tipo") return false;
    return value !== "";
  });

  const referenciaLabel = fixedTipo
    ? REFERENCIA_LABEL[fixedTipo]
    : "Cliente / Clínica";

  const countLabel = fixedTipo === "clinica" ? "custo" : "fatura";

  const statusOptions =
    fixedTipo === "clinica"
      ? [
          { value: "rascunho", label: HISTORICO_STATUS_FILTER_LABELS_CLINICA.rascunho },
          { value: "emitida", label: HISTORICO_STATUS_FILTER_LABELS_CLINICA.emitida },
          { value: "cancelada", label: HISTORICO_STATUS_FILTER_LABELS_CLINICA.cancelada },
          { value: "paga", label: HISTORICO_STATUS_FILTER_LABELS_CLINICA.paga },
          { value: "pendente", label: HISTORICO_STATUS_FILTER_LABELS_CLINICA.pendente },
        ]
      : [
          { value: "rascunho", label: "Aberta para emissão" },
          { value: "emitida", label: "Emitida" },
          { value: "vencida", label: "Vencida" },
          { value: "cancelada", label: "Cancelada" },
          { value: "paga", label: "Paga" },
          { value: "pendente", label: "Pendente" },
        ];

  return (
    <div className="mb-4 rounded-xl border border-[#e8edf5] bg-[#f8fafc]/80 p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-[#64748b]">
          {totalFiltradas} de {totalGeral} {countLabel}
          {totalGeral !== 1 ? "s" : ""} no filtro
        </p>
        {hasFilters && (
          <button
            type="button"
            className="text-[10px] font-semibold text-brand-blue hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={onClear}
          >
            Limpar filtros do histórico
          </button>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
          fixedTipo ? "xl:grid-cols-3" : "xl:grid-cols-4"
        }`}
      >
        {!fixedTipo && (
          <FilterField label="Tipo">
            <select
              className={selectClass}
              value={filters.tipo}
              disabled={disabled}
              onChange={(e) => onChange("tipo", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="cliente">Cliente</option>
              <option value="clinica">Clínica</option>
            </select>
          </FilterField>
        )}

        <FilterField label={referenciaLabel}>
          <input
            className={selectClass}
            type="text"
            placeholder="Buscar por nome..."
            value={filters.referencia}
            disabled={disabled}
            onChange={(e) => onChange("referencia", e.target.value)}
          />
        </FilterField>

        <FilterField label="Período (mês/ano)">
          <MonthReferenceSelect
            className={selectClass}
            value={filters.mesReferencia}
            disabled={disabled}
            allowEmpty
            emptyLabel="Todos"
            onChange={(value) => onChange("mesReferencia", value)}
          />
        </FilterField>

        <FilterField label="Status">
          <select
            className={selectClass}
            value={filters.status}
            disabled={disabled}
            onChange={(e) => onChange("status", e.target.value)}
          >
            <option value="">Todos</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
    </div>
  );
}
