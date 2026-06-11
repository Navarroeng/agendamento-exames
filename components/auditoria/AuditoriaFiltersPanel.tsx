import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import type { AuditoriaFilters } from "@/lib/auditoria";

interface AuditoriaFiltersPanelProps {
  filters: AuditoriaFilters;
  usuarios: Array<{ email: string; nome: string }>;
  moduloOptions: Array<{ value: string; label: string }>;
  acaoOptions: Array<{ value: string; label: string }>;
  total: number;
  loading: boolean;
  onChange: (field: keyof AuditoriaFilters, value: string) => void;
  onClear: () => void;
}

export function AuditoriaFiltersPanel({
  filters,
  usuarios,
  moduloOptions,
  acaoOptions,
  total,
  loading,
  onChange,
  onClear,
}: AuditoriaFiltersPanelProps) {
  return (
    <Panel title="Filtros" icon={<IconFilter />}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-[#94a3b8]">
          {loading
            ? "Carregando registros..."
            : `${total} registro${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`}
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
        <Field label="Data inicial">
          <input
            type="date"
            className="field-input"
            value={filters.dataInicio}
            disabled={loading}
            onChange={(e) => onChange("dataInicio", e.target.value)}
          />
        </Field>
        <Field label="Data final">
          <input
            type="date"
            className="field-input"
            value={filters.dataFim}
            disabled={loading}
            onChange={(e) => onChange("dataFim", e.target.value)}
          />
        </Field>
        <Field label="Usuário">
          <select
            className="field-input"
            value={filters.usuarioEmail}
            disabled={loading}
            onChange={(e) => onChange("usuarioEmail", e.target.value)}
          >
            <option value="">Todos</option>
            {usuarios.map((usuario) => (
              <option key={usuario.email} value={usuario.email}>
                {usuario.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Módulo">
          <select
            className="field-input"
            value={filters.modulo}
            disabled={loading}
            onChange={(e) => onChange("modulo", e.target.value)}
          >
            <option value="">Todos</option>
            {moduloOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Ação">
          <select
            className="field-input"
            value={filters.acao}
            disabled={loading}
            onChange={(e) => onChange("acao", e.target.value)}
          >
            <option value="">Todas</option>
            {acaoOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Panel>
  );
}
