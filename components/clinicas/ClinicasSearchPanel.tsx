import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import {
  hasActiveClinicasListFilters,
  type ClinicasListFilters,
} from "@/lib/clinica-filters";

interface ClinicasSearchPanelProps {
  filters: ClinicasListFilters;
  totalFiltrados: number;
  onChange: (value: string) => void;
  onClear: () => void;
}

const inputClass = "field-input field-input-compact w-full text-sm";

export function ClinicasSearchPanel({
  filters,
  totalFiltrados,
  onChange,
  onClear,
}: ClinicasSearchPanelProps) {
  const hasFilters = hasActiveClinicasListFilters(filters);

  return (
    <Panel title="Pesquisa" icon={<IconFilter />} iconTone="blue">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748b]">
          {totalFiltrados} clínica{totalFiltrados !== 1 ? "s" : ""} encontrada
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

      <div>
        <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
          Buscar clínica
        </label>
        <input
          className={inputClass}
          placeholder="Nome, cidade, responsável, e-mail..."
          value={filters.busca}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Panel>
  );
}
