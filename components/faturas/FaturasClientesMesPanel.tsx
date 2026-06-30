"use client";

import { Field } from "@/components/ui/Field";
import { Panel } from "@/components/ui/Panel";
import {
  IconCalendar,
  IconReceipt,
  IconSearch,
} from "@/components/ui/icons/OutlineIcons";
import { maskDateBR, maskMonthYearBR } from "@/lib/agendamento-datetime";
import type { ClienteFilterOption } from "@/lib/cliente-display";
import type { FaturaFilters } from "@/lib/fatura-filters";
import {
  FATURA_CLIENTE_MES_STATUS_LABELS,
  type ClienteFaturaMesRow,
  type FaturaClienteMesStatus,
  type FaturaMesResumoGeral,
} from "@/lib/fatura-mes-resumo";
import { formatCurrency } from "@/lib/money";
import { FaturasClienteMesRowActions } from "./FaturasClienteMesRowActions";

function statusBadge(status: FaturaClienteMesStatus) {
  const styles: Record<FaturaClienteMesStatus, string> = {
    aberta_emissao: "bg-brand-orange-soft text-[#c96d00]",
    rascunho: "bg-[#fef3c7] text-[#b45309]",
    emitida: "bg-brand-green-soft text-brand-green",
    paga: "bg-brand-green-soft text-brand-green",
    em_aberto: "bg-brand-orange-soft text-[#c96d00]",
    cancelada: "bg-brand-red-soft text-brand-red",
  };

  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}
    >
      {FATURA_CLIENTE_MES_STATUS_LABELS[status]}
    </span>
  );
}

interface FaturasClientesMesPanelProps {
  filters: FaturaFilters;
  options: { clientes: ClienteFilterOption[] };
  rows: ClienteFaturaMesRow[];
  resumo: FaturaMesResumoGeral | null;
  mesValido: boolean;
  loading: boolean;
  saving: boolean;
  onChange: (field: keyof FaturaFilters, value: string) => void;
  onVisualizarAgendamentos: (clienteNome: string) => void;
  onEmitirFatura: (clienteNome: string) => void;
  onVisualizarFatura: (id: string) => void;
  onGerarPdf: (id: string) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onEditarPagamento: (id: string) => void;
  onMarcarPendente: (id: string) => void;
}

const RESUMO_CARDS: {
  key: keyof FaturaMesResumoGeral;
  label: string;
  tone: string;
  format?: (v: number) => string;
}[] = [
  {
    key: "totalClientes",
    label: "Clientes faturáveis",
    tone: "border-[#e8edf5] bg-white text-navy",
  },
  {
    key: "totalAgendamentos",
    label: "Agendamentos",
    tone: "border-[#c7d7f5]/80 bg-[#f0f4ff] text-brand-blue",
  },
  {
    key: "totalExames",
    label: "Exames",
    tone: "border-[#c7d7f5]/80 bg-[#f0f4ff] text-brand-blue",
  },
  {
    key: "valorPrevisto",
    label: "Previsto no mês",
    tone: "border-[#e8edf5] bg-white text-navy",
    format: formatCurrency,
  },
  {
    key: "valorEmitido",
    label: "Já emitido",
    tone: "border-[#bbf7d0]/80 bg-[#f0fdf4] text-brand-green",
    format: formatCurrency,
  },
  {
    key: "valorPago",
    label: "Pago",
    tone: "border-[#bbf7d0]/80 bg-[#f0fdf4] text-brand-green",
    format: formatCurrency,
  },
  {
    key: "valorEmAberto",
    label: "Em aberto",
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
    format: formatCurrency,
  },
];

export function FaturasClientesMesPanel({
  filters,
  options,
  rows,
  resumo,
  mesValido,
  loading,
  saving,
  onChange,
  onVisualizarAgendamentos,
  onEmitirFatura,
  onVisualizarFatura,
  onGerarPdf,
  onCancelar,
  onMarcarPago,
  onEditarPagamento,
  onMarcarPendente,
}: FaturasClientesMesPanelProps) {
  const disabled = loading || saving;

  return (
    <div className="space-y-5">
      <Panel title="Mês de referência" icon={<IconSearch />}>
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3.5 sm:grid-cols-2 xl:grid-cols-4">
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
              Mês completo (ex.: 06/2026 = 01/06 a 30/06)
            </p>
          </Field>

          <Field label="Filtrar cliente (opcional)">
            <input
              className="field-input"
              list="fatura-mes-clientes"
              placeholder="Buscar cliente..."
              value={filters.cliente}
              disabled={disabled}
              onChange={(e) => onChange("cliente", e.target.value)}
            />
            <datalist id="fatura-mes-clientes">
              {options.clientes.map((c) => (
                <option key={c.value} value={c.value} label={c.label} />
              ))}
            </datalist>
          </Field>

          <div className="field -mt-2.5 flex flex-col gap-1.5 sm:col-span-2 xl:col-span-1">
            <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#64748b]">
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-brand-blue/20 bg-white text-brand-blue">
                <IconCalendar size={10} />
              </span>
              Data de vencimento padrão
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
              Usada ao emitir novas faturas
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]">
          Apenas agendamentos com status{" "}
          <strong className="font-semibold text-navy">agendado</strong> entram
          no faturamento. Os valores são calculados em tempo real a partir dos
          agendamentos do mês selecionado.
        </p>
      </Panel>

      {mesValido && resumo && (
        <Panel title="Resumo do mês" icon={<IconReceipt />} iconTone="green">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
            {RESUMO_CARDS.map((card) => {
              const value = resumo[card.key];
              const display = card.format
                ? card.format(value)
                : String(value);

              return (
                <div
                  key={card.key}
                  className={`rounded-xl border px-3.5 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${card.tone}`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
                    {card.label}
                  </p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums xl:text-xl">
                    {display}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel
        title="Faturamento por cliente"
        icon={<IconReceipt />}
        iconTone="blue"
      >
        {loading && (
          <p className="py-6 text-center text-sm text-app-muted">
            Carregando agendamentos...
          </p>
        )}

        {!loading && !mesValido && (
          <p className="py-6 text-center text-sm text-app-muted">
            Informe um mês de referência válido (MM/AAAA) para listar os
            clientes faturáveis.
          </p>
        )}

        {!loading && mesValido && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-app-muted">
            Nenhum cliente com agendamentos faturáveis neste mês
            {filters.cliente.trim() ? " para o filtro informado" : ""}.
          </p>
        )}

        {!loading && mesValido && rows.length > 0 && (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]">
                  {[
                    "Cliente / Empresa",
                    "Período",
                    "Agendamentos",
                    "Exames",
                    "Valor total",
                    "Status",
                    "Ações",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[#64748b]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.clienteNome}
                    className="border-b border-[#eef2f7]/80 transition-colors hover:bg-[#f0f4ff]/40"
                  >
                    <td
                      className="max-w-[180px] truncate px-2.5 py-2 text-xs font-semibold text-navy"
                      title={row.clienteNome}
                    >
                      {row.clienteNome}
                    </td>
                    <td className="px-2.5 py-2 text-xs text-[#64748b]">
                      {row.periodoLabel}
                    </td>
                    <td className="px-2.5 py-2 text-xs tabular-nums text-[#64748b]">
                      {row.qtdAgendamentos}
                    </td>
                    <td className="px-2.5 py-2 text-xs tabular-nums text-[#64748b]">
                      {row.qtdExames}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-xs font-semibold tabular-nums text-navy">
                      {formatCurrency(row.valorTotal)}
                    </td>
                    <td className="px-2.5 py-2">{statusBadge(row.status)}</td>
                    <td className="px-2.5 py-2">
                      <FaturasClienteMesRowActions
                        row={row}
                        saving={saving}
                        onVisualizarAgendamentos={onVisualizarAgendamentos}
                        onEmitirFatura={onEmitirFatura}
                        onVisualizarFatura={onVisualizarFatura}
                        onGerarPdf={onGerarPdf}
                        onCancelar={onCancelar}
                        onMarcarPago={onMarcarPago}
                        onEditarPagamento={onEditarPagamento}
                        onMarcarPendente={onMarcarPendente}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
