"use client";

import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import {
  hasActiveClientesListFilters,
  type ClientesListFilters,
} from "@/lib/cliente-filters";
import { CLIENTE_AGENDAMENTO_FILTER_OPTIONS } from "@/lib/cliente-disponivel-agendamento";

interface ClientesSearchPanelProps {
  filters: ClientesListFilters;
  totalFiltrados: number;
  onChangeBusca: (value: string) => void;
  onChangeAgendamento: (value: ClientesListFilters["agendamento"]) => void;
  onClear: () => void;
}

const inputClass = "field-input field-input-compact w-full text-sm";

export function ClientesSearchPanel({
  filters,
  totalFiltrados,
  onChangeBusca,
  onChangeAgendamento,
  onClear,
}: ClientesSearchPanelProps) {
  const hasFilters = hasActiveClientesListFilters(filters);

  return (
    <Panel title="Pesquisa" icon={<IconFilter />} iconTone="blue">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748b]">
          {totalFiltrados} cliente{totalFiltrados !== 1 ? "s" : ""} encontrado
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Buscar cliente
          </label>
          <input
            className={inputClass}
            placeholder="Razão social, CNPJ, e-mail ou telefone..."
            value={filters.busca}
            onChange={(e) => onChangeBusca(e.target.value)}
          />
          <p className="mt-1.5 text-[10px] text-[#94a3b8]">
            A busca considera todos os clientes cadastrados, não apenas a página
            atual.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Disponibilidade para agendamento
          </label>
          <select
            className={inputClass}
            value={filters.agendamento}
            onChange={(e) =>
              onChangeAgendamento(
                e.target.value as ClientesListFilters["agendamento"]
              )
            }
          >
            {CLIENTE_AGENDAMENTO_FILTER_OPTIONS.map((option) => (
              <option key={option.value || "todos"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Panel>
  );
}
