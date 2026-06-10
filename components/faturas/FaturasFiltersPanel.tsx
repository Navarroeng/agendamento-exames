import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import { IconCalendar, IconSearch } from "@/components/ui/icons/OutlineIcons";
import { maskDateBR, maskMonthYearBR } from "@/lib/agendamento-datetime";
import type { FaturaFilters } from "@/lib/fatura-filters";
import type { ClienteFilterOption } from "@/lib/cliente-display";
import type { FaturaTipo } from "@/lib/types";

interface FaturasFiltersPanelProps {
  variant: FaturaTipo;
  filters: FaturaFilters;
  options: {
    clientes: ClienteFilterOption[];
    clinicas: string[];
    responsaveis: string[];
  };
  loading: boolean;
  saving: boolean;
  totalFiltrados: number;
  onChange: (field: keyof FaturaFilters, value: string) => void;
  onClear: () => void;
  onPrevia: () => void;
}

const PANEL_META: Record<
  FaturaTipo,
  { title: string; previaLabel: string }
> = {
  cliente: {
    title: "Filtros da fatura",
    previaLabel: "Pré-visualizar fatura",
  },
  clinica: {
    title: "Filtros de custo",
    previaLabel: "Pré-visualizar custo",
  },
};

export function FaturasFiltersPanel({
  variant,
  filters,
  options,
  loading,
  saving,
  totalFiltrados,
  onChange,
  onClear,
  onPrevia,
}: FaturasFiltersPanelProps) {
  const disabled = loading || saving;
  const meta = PANEL_META[variant];
  const isCliente = variant === "cliente";

  return (
    <Panel title={meta.title} icon={<IconSearch />}>
      <p className="mb-4 text-[11px] font-medium text-[#94a3b8]">
        {loading
          ? "Carregando agendamentos..."
          : `${totalFiltrados} agendamento${totalFiltrados !== 1 ? "s" : ""} no filtro atual`}
      </p>

      <div
        className={`grid grid-cols-1 items-start gap-x-4 gap-y-3.5 ${
          isCliente ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2"
        }`}
      >
        <Field label="Mês de referência">
          <input
            className="field-input"
            type="text"
            inputMode="numeric"
            placeholder="MM/AAAA"
            maxLength={7}
            value={filters.mesReferencia}
            disabled={disabled}
            onChange={(e) =>
              onChange("mesReferencia", maskMonthYearBR(e.target.value))
            }
          />
          <p className="text-[10px] text-[#94a3b8]">
            Mês completo (ex.: 05/2026 = 01/05 a 31/05)
          </p>
        </Field>

        {isCliente && (
          <>
            <Field label="Empresa / Cliente">
              <input
                className="field-input"
                list="fatura-clientes"
                placeholder="Buscar cliente..."
                value={filters.cliente}
                disabled={disabled}
                onChange={(e) => onChange("cliente", e.target.value)}
              />
              <datalist id="fatura-clientes">
                {options.clientes.map((c) => (
                  <option key={c.value} value={c.value} label={c.label} />
                ))}
              </datalist>
            </Field>

            <Field label="Responsável">
              <input
                className="field-input"
                list="fatura-responsaveis"
                placeholder="Buscar responsável..."
                value={filters.responsavel}
                disabled={disabled}
                onChange={(e) => onChange("responsavel", e.target.value)}
              />
              <datalist id="fatura-responsaveis">
                {options.responsaveis.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </Field>

            <div className="field -mt-2.5 flex flex-col gap-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#64748b]">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-brand-blue/20 bg-white text-brand-blue">
                  <IconCalendar size={10} />
                </span>
                Data de vencimento
              </label>
              <div className="overflow-hidden rounded-xl border border-[#c7d7f5]/90 bg-gradient-to-br from-[#f0f4ff] via-[#fafbff] to-[#fffbeb]/50 p-1.5 shadow-[0_4px_16px_rgba(79,99,255,0.1)] ring-1 ring-brand-blue/10">
                <input
                  className="field-input w-full border-[#c7d7f5] bg-white font-semibold text-navy shadow-[inset_0_1px_2px_rgba(79,99,255,0.06)] focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15"
                  type="text"
                  inputMode="numeric"
                  placeholder="DD/MM/AAAA"
                  maxLength={10}
                  value={filters.dataVencimento}
                  disabled={disabled}
                  onChange={(e) =>
                    onChange("dataVencimento", maskDateBR(e.target.value))
                  }
                />
              </div>
              <p className="text-[10px] text-[#94a3b8]">
                Obrigatório para emitir a fatura
              </p>
            </div>
          </>
        )}

        {!isCliente && (
          <Field label="Clínica">
            <input
              className="field-input"
              list="fatura-clinicas"
              placeholder="Buscar clínica..."
              value={filters.clinica}
              disabled={disabled}
              onChange={(e) => onChange("clinica", e.target.value)}
            />
            <datalist id="fatura-clinicas">
              {options.clinicas.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]">
        Apenas agendamentos com status{" "}
        <strong className="font-semibold text-navy">agendado</strong> entram no
        faturamento. Pendências operacionais (ASO, eSocial etc.){" "}
        <strong className="font-semibold text-navy">não impedem</strong> a
        geração da fatura.
      </p>

      <div className="mt-5 flex flex-col gap-2 border-t border-[#eef2f7] pt-4 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className="btn btn-primary justify-center sm:w-auto"
          disabled={disabled}
          onClick={onPrevia}
        >
          {meta.previaLabel}
        </button>
        <button
          type="button"
          className="btn btn-muted justify-center sm:w-auto"
          disabled={disabled}
          onClick={onClear}
        >
          Limpar filtros
        </button>
      </div>
    </Panel>
  );
}
