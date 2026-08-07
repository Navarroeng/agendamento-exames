"use client";

import { useEffect, useId, useState } from "react";
import { PanelIcon } from "@/components/ui/IconBox";
import { IconFilter } from "@/components/ui/icons/OutlineIcons";
import {
  EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS,
  type RiscosPsicossociaisFilters,
} from "@/lib/riscos-psicossociais";
import { formatResponsavelOrcamentoDisplay } from "@/lib/orcamento-responsavel";

interface RiscosPsicossociaisSearchPanelProps {
  filters: RiscosPsicossociaisFilters;
  totalFiltrados: number;
  responsaveis: string[];
  onChange: <K extends keyof RiscosPsicossociaisFilters>(
    field: K,
    value: RiscosPsicossociaisFilters[K]
  ) => void;
  onClear: () => void;
}

const inputClass = "field-input field-input-compact w-full text-sm";
const SESSION_KEY = "riscos-psicossociais-pesquisa-expanded";

function hasActiveFilters(filters: RiscosPsicossociaisFilters): boolean {
  return (
    filters.busca.trim() !== "" ||
    filters.responsavel !== EMPTY_RISCOS_PSICOSSOCIAIS_FILTERS.responsavel
  );
}

function readSessionExpanded(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function RiscosPsicossociaisSearchPanel({
  filters,
  totalFiltrados,
  responsaveis,
  onChange,
  onClear,
}: RiscosPsicossociaisSearchPanelProps) {
  const formId = useId();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(readSessionExpanded());
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, expanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [expanded]);

  const active = hasActiveFilters(filters);

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e4ebf4] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <PanelIcon tone="blue">
            <IconFilter size={16} />
          </PanelIcon>
          <div>
            <p className="text-sm font-extrabold text-navy">Pesquisar / Filtrar</p>
            <p className="text-[11px] text-app-muted">
              {totalFiltrados} processo{totalFiltrados === 1 ? "" : "s"}
              {active ? " · filtros ativos" : ""}
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-brand-blue">
          {expanded ? "Recolher" : "Expandir"}
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-[#eef2f7] px-4 py-4 sm:px-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <div className="md:col-span-2">
              <label
                htmlFor={`${formId}-busca`}
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]"
              >
                Busca
              </label>
              <input
                id={`${formId}-busca`}
                className={inputClass}
                placeholder="Cliente, CNPJ, orçamento..."
                value={filters.busca}
                onChange={(e) => onChange("busca", e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor={`${formId}-resp`}
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8]"
              >
                Responsável
              </label>
              <select
                id={`${formId}-resp`}
                className={inputClass}
                value={filters.responsavel}
                onChange={(e) => onChange("responsavel", e.target.value)}
              >
                <option value="">Todos</option>
                {responsaveis.map((nome) => (
                  <option key={nome} value={nome}>
                    {formatResponsavelOrcamentoDisplay(nome)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="btn btn-muted text-xs"
              onClick={onClear}
              disabled={!active}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
