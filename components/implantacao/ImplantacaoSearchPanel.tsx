"use client";

import { Panel } from "@/components/ui/Panel";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import {
  EMPTY_IMPLANTACAO_FILTERS,
  IMPLANTACAO_ETAPA_OPTIONS,
  type ImplantacaoFilters,
} from "@/lib/implantacao-clientes";
import { ORCAMENTO_ORIGEM_OPTIONS } from "@/lib/orcamento-origem";
import { ORCAMENTO_STATUS_OPTIONS } from "@/lib/orcamento-types";

interface ImplantacaoSearchPanelProps {
  filters: ImplantacaoFilters;
  totalFiltrados: number;
  responsaveis: string[];
  onChange: <K extends keyof ImplantacaoFilters>(
    field: K,
    value: ImplantacaoFilters[K]
  ) => void;
  onClear: () => void;
}

const inputClass = "field-input field-input-compact w-full text-sm";

function hasActiveFilters(filters: ImplantacaoFilters): boolean {
  return (
    filters.busca.trim() !== "" ||
    filters.responsavel !== "" ||
    filters.etapa !== "" ||
    filters.status !== "" ||
    filters.origem !== "" ||
    filters.aprovadoDe !== "" ||
    filters.aprovadoAte !== "" ||
    filters.andamento !== EMPTY_IMPLANTACAO_FILTERS.andamento ||
    filters.sort !== EMPTY_IMPLANTACAO_FILTERS.sort
  );
}

export function ImplantacaoSearchPanel({
  filters,
  totalFiltrados,
  responsaveis,
  onChange,
  onClear,
}: ImplantacaoSearchPanelProps) {
  const active = hasActiveFilters(filters);

  return (
    <Panel title="Pesquisa" icon={<IconFilter />} iconTone="blue">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-[#64748b]">
          {totalFiltrados} processo
          {totalFiltrados !== 1 ? "s" : ""} encontrado
          {totalFiltrados !== 1 ? "s" : ""}
        </p>
        {active && (
          <button
            type="button"
            className="text-[11px] font-semibold text-brand-blue hover:underline"
            onClick={onClear}
          >
            Limpar pesquisa
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-2">
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Buscar
          </label>
          <input
            className={inputClass}
            placeholder="Orçamento, contrato, cliente ou CNPJ..."
            value={filters.busca}
            onChange={(e) => onChange("busca", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Andamento
          </label>
          <select
            className={inputClass}
            value={filters.andamento}
            onChange={(e) =>
              onChange(
                "andamento",
                e.target.value as ImplantacaoFilters["andamento"]
              )
            }
          >
            <option value="em_andamento">Em andamento</option>
            <option value="concluidos">Concluídos</option>
            <option value="todos">Todos</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Etapa atual
          </label>
          <select
            className={inputClass}
            value={filters.etapa}
            onChange={(e) =>
              onChange("etapa", e.target.value as ImplantacaoFilters["etapa"])
            }
          >
            <option value="">Todas</option>
            {IMPLANTACAO_ETAPA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Responsável
          </label>
          <select
            className={inputClass}
            value={filters.responsavel}
            onChange={(e) => onChange("responsavel", e.target.value)}
          >
            <option value="">Todos</option>
            {responsaveis.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Status
          </label>
          <select
            className={inputClass}
            value={filters.status}
            onChange={(e) =>
              onChange("status", e.target.value as ImplantacaoFilters["status"])
            }
          >
            <option value="">Todos</option>
            {ORCAMENTO_STATUS_OPTIONS.filter((o) =>
              ["aprovado", "cancelado"].includes(o.value)
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Origem do cliente
          </label>
          <select
            className={inputClass}
            value={filters.origem}
            onChange={(e) =>
              onChange("origem", e.target.value as ImplantacaoFilters["origem"])
            }
          >
            <option value="">Todas</option>
            {ORCAMENTO_ORIGEM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Ordenar por
          </label>
          <select
            className={inputClass}
            value={filters.sort}
            onChange={(e) =>
              onChange("sort", e.target.value as ImplantacaoFilters["sort"])
            }
          >
            <option value="aprovado_em">Data da aprovação (padrão)</option>
            <option value="prioridade">Prioridade</option>
            <option value="cliente">Cliente</option>
            <option value="etapa">Etapa atual</option>
            <option value="responsavel">Responsável</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Aprovação de
          </label>
          <input
            type="date"
            className={inputClass}
            value={filters.aprovadoDe}
            onChange={(e) => onChange("aprovadoDe", e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]">
            Aprovação até
          </label>
          <input
            type="date"
            className={inputClass}
            value={filters.aprovadoAte}
            onChange={(e) => onChange("aprovadoAte", e.target.value)}
          />
        </div>
      </div>
    </Panel>
  );
}
