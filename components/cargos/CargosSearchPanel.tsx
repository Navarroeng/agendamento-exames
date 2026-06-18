import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import {
  hasActiveCargosListFilters,
  type CargosListFilters,
} from "@/lib/cargo-filters";

interface CargosSearchPanelProps {
  filters: CargosListFilters;
  totalFiltrados: number;
  onChange: (value: string) => void;
  onClear: () => void;
}

const inputClass = "field-input field-input-compact w-full text-sm";

export function CargosSearchPanel({
  filters,
  totalFiltrados,
  onChange,
  onClear,
}: CargosSearchPanelProps) {
  const hasFilters = hasActiveCargosListFilters(filters);

  return (
    <Panel title="Pesquisa" icon={<IconFilter />} iconTone="blue">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748b]">
          {totalFiltrados} cargo{totalFiltrados !== 1 ? "s" : ""} encontrado
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
          Buscar cargo
        </label>
        <input
          className={inputClass}
          placeholder="Nome ou descrição do cargo..."
          value={filters.busca}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Panel>
  );
}
