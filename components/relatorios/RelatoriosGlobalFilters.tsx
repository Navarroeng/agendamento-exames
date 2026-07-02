"use client";

import { Field } from "@/components/ui/Field";
import { MonthReferenceSelect } from "@/components/ui/MonthReferenceSelect";
import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import { CLIENTE_CONTRATO_STATUS_OPTIONS } from "@/lib/cliente-contrato-constants";
import type { RelatoriosFilters } from "@/lib/relatorios/types";
import type { ClienteFilterOption } from "@/lib/cliente-display";

interface RelatoriosGlobalFiltersProps {
  filters: RelatoriosFilters;
  expanded: boolean;
  options: {
    empresas: ClienteFilterOption[];
    clinicas: string[];
    responsaveis: string[];
  };
  onChange: (field: keyof RelatoriosFilters, value: string) => void;
  onClear: () => void;
  onToggle: () => void;
}

export function RelatoriosGlobalFilters({
  filters,
  expanded,
  options,
  onChange,
  onClear,
  onToggle,
}: RelatoriosGlobalFiltersProps) {
  return (
    <Panel
      title="Filtros globais"
      icon={<IconFilter />}
      iconTone="blue"
      action={
        <button
          type="button"
          className="text-xs font-bold text-brand-blue"
          onClick={onToggle}
        >
          {expanded ? "Recolher" : "Expandir"}
        </button>
      }
    >
      {expanded ? (
        <div className="form-grid grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Mês de referência">
            <MonthReferenceSelect
              value={filters.mesReferencia}
              allowEmpty
              onChange={(value) => onChange("mesReferencia", value)}
            />
          </Field>
          <Field label="Empresa">
            <input
              className="field-input"
              list="relatorio-empresas"
              value={filters.empresa}
              onChange={(e) => onChange("empresa", e.target.value)}
            />
            <datalist id="relatorio-empresas">
              {options.empresas.map((e) => (
                <option key={e.value} value={e.value} label={e.label} />
              ))}
            </datalist>
          </Field>
          <Field label="Clínica">
            <input
              className="field-input"
              list="relatorio-clinicas"
              value={filters.clinica}
              onChange={(e) => onChange("clinica", e.target.value)}
            />
            <datalist id="relatorio-clinicas">
              {options.clinicas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Responsável">
            <input
              className="field-input"
              list="relatorio-responsaveis"
              value={filters.responsavel}
              onChange={(e) => onChange("responsavel", e.target.value)}
            />
            <datalist id="relatorio-responsaveis">
              {options.responsaveis.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </Field>
          <Field label="Status contrato">
            <select
              className="field-input"
              value={filters.statusContrato}
              onChange={(e) => onChange("statusContrato", e.target.value)}
            >
              <option value="">Todos</option>
              {CLIENTE_CONTRATO_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end md:col-span-2 xl:col-span-5">
            <button type="button" className="btn btn-muted" onClick={onClear}>
              Limpar filtros
            </button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
