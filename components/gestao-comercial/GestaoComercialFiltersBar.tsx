"use client";

import type { GestaoComercialFilters } from "@/lib/gestao-comercial";
import { MESES_PT } from "@/lib/gestao-comercial";
import type { OrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import { formatResponsavelOrcamentoDisplay } from "@/lib/orcamento-responsavel";

interface GestaoComercialFiltersProps {
  filters: GestaoComercialFilters;
  anosOptions: number[];
  responsaveisOptions: string[];
  origemOptions: readonly { value: OrcamentoOrigemCliente; label: string }[];
  onChange: <K extends keyof GestaoComercialFilters>(
    key: K,
    value: GestaoComercialFilters[K]
  ) => void;
  onClear: () => void;
}

export function GestaoComercialFiltersBar({
  filters,
  anosOptions,
  responsaveisOptions,
  origemOptions,
  onChange,
  onClear,
}: GestaoComercialFiltersProps) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold text-navy">Filtros</h3>
        <button type="button" className="btn btn-muted text-xs" onClick={onClear}>
          Limpar
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="block text-xs font-semibold text-[#5b6577]">
          Ano
          <select
            className="field-input mt-1"
            value={filters.ano}
            onChange={(e) => onChange("ano", Number(e.target.value))}
          >
            {anosOptions.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#5b6577]">
          Mês (cards)
          <select
            className="field-input mt-1"
            value={filters.mes ?? ""}
            onChange={(e) =>
              onChange(
                "mes",
                e.target.value ? Number(e.target.value) : null
              )
            }
            disabled={filters.usarPeriodoPersonalizado}
          >
            {MESES_PT.map((label, idx) => (
              <option key={label} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#5b6577]">
          Responsável (fechamento)
          <select
            className="field-input mt-1"
            value={filters.responsavel}
            onChange={(e) => onChange("responsavel", e.target.value)}
          >
            <option value="">Todos</option>
            {responsaveisOptions.map((nome) => (
              <option key={nome} value={nome}>
                {formatResponsavelOrcamentoDisplay(nome)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#5b6577]">
          Origem
          <select
            className="field-input mt-1"
            value={filters.origem}
            onChange={(e) =>
              onChange("origem", e.target.value as GestaoComercialFilters["origem"])
            }
          >
            <option value="">Todas</option>
            {origemOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#5b6577]">
          Novo / Renovação
          <select
            className="field-input mt-1"
            value={filters.tipo}
            onChange={(e) =>
              onChange("tipo", e.target.value as GestaoComercialFilters["tipo"])
            }
          >
            <option value="">Todos</option>
            <option value="novo">Novos clientes</option>
            <option value="renovacao">Renovações</option>
          </select>
        </label>
        <label className="block text-xs font-semibold text-[#5b6577]">
          Status do contrato
          <select
            className="field-input mt-1"
            value={filters.statusContrato}
            onChange={(e) =>
              onChange(
                "statusContrato",
                e.target.value as GestaoComercialFilters["statusContrato"]
              )
            }
          >
            <option value="ativos">Ativos</option>
            <option value="encerrados">Encerrados/Cancelados</option>
            <option value="todos">Todos</option>
          </select>
        </label>
        <label className="flex items-end gap-2 text-xs font-semibold text-[#5b6577]">
          <input
            type="checkbox"
            className="mb-2.5"
            checked={filters.usarPeriodoPersonalizado}
            onChange={(e) => onChange("usarPeriodoPersonalizado", e.target.checked)}
          />
          Período personalizado
        </label>
        {filters.usarPeriodoPersonalizado ? (
          <>
            <label className="block text-xs font-semibold text-[#5b6577]">
              De
              <input
                type="date"
                className="field-input mt-1"
                value={filters.periodoInicio}
                onChange={(e) => onChange("periodoInicio", e.target.value)}
              />
            </label>
            <label className="block text-xs font-semibold text-[#5b6577]">
              Até
              <input
                type="date"
                className="field-input mt-1"
                value={filters.periodoFim}
                onChange={(e) => onChange("periodoFim", e.target.value)}
              />
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}
