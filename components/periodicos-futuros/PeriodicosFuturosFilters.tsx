import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import type { PeriodicoFuturoFilters } from "@/lib/types";

interface PeriodicosFuturosFiltersProps {
  filters: PeriodicoFuturoFilters;
  options: {
    empresas: string[];
    colaboradores: string[];
    cargos: string[];
    exames: string[];
  };
  totalFiltrados: number;
  loading: boolean;
  onChange: (field: keyof PeriodicoFuturoFilters, value: string) => void;
  onClear: () => void;
}

const STATUS_OPTIONS: { value: PeriodicoFuturoFilters["status"]; label: string }[] =
  [
    { value: "", label: "Todos" },
    { value: "vencido", label: "Vencido" },
    { value: "vence_30_dias", label: "Vence em 30 dias" },
    { value: "em_dia", label: "Em dia" },
    { value: "reagendado", label: "Reagendado" },
    { value: "cancelado", label: "Cancelado" },
  ];

export function PeriodicosFuturosFilters({
  filters,
  options,
  totalFiltrados,
  loading,
  onChange,
  onClear,
}: PeriodicosFuturosFiltersProps) {
  return (
    <Panel title="Filtros" icon={<IconFilter />}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-[#94a3b8]">
          {loading
            ? "Carregando registros..."
            : `${totalFiltrados} periódico${totalFiltrados === 1 ? "" : "s"} futuro${totalFiltrados === 1 ? "" : "s"} no filtro atual`}
        </p>
        <button
          type="button"
          className="text-[11px] font-bold text-brand-blue"
          onClick={onClear}
        >
          Limpar filtros
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Empresa">
          <select
            className="field-input"
            value={filters.empresa}
            disabled={loading}
            onChange={(e) => onChange("empresa", e.target.value)}
          >
            <option value="">Todas</option>
            {options.empresas.map((empresa) => (
              <option key={empresa} value={empresa}>
                {empresa}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Colaborador">
          <select
            className="field-input"
            value={filters.colaborador}
            disabled={loading}
            onChange={(e) => onChange("colaborador", e.target.value)}
          >
            <option value="">Todos</option>
            {options.colaboradores.map((colaborador) => (
              <option key={colaborador} value={colaborador}>
                {colaborador}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cargo">
          <select
            className="field-input"
            value={filters.cargo}
            disabled={loading}
            onChange={(e) => onChange("cargo", e.target.value)}
          >
            <option value="">Todos</option>
            {options.cargos.map((cargo) => (
              <option key={cargo} value={cargo}>
                {cargo}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Exame">
          <select
            className="field-input"
            value={filters.exame}
            disabled={loading}
            onChange={(e) => onChange("exame", e.target.value)}
          >
            <option value="">Todos</option>
            {options.exames.map((exame) => (
              <option key={exame} value={exame}>
                {exame}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            className="field-input"
            value={filters.status}
            disabled={loading}
            onChange={(e) => onChange("status", e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Panel>
  );
}
