"use client";

import { Field } from "@/components/ui/Field";
import { MonthReferenceSelect } from "@/components/ui/MonthReferenceSelect";
import { Panel } from "@/components/ui/Panel";
import {
  IconReceipt,
  IconSearch,
  IconWallet,
} from "@/components/ui/icons/OutlineIcons";
import type { ClienteFilterOption } from "@/lib/cliente-display";
import type { FaturaFilters } from "@/lib/fatura-filters";
import {
  FATURA_MES_STATUS_LABELS,
  FATURA_MES_STATUS_LABELS_CLINICA,
  type FaturaMesResumoGeral,
  type FaturaMesRow,
  type FaturaMesStatus,
} from "@/lib/fatura-mes-resumo";
import { formatCurrency } from "@/lib/money";
import type { FaturaTipo } from "@/lib/types";
import { FaturasMesRowActions } from "./FaturasMesRowActions";

const PANEL_CONFIG: Record<
  FaturaTipo,
  {
    filterField: "cliente" | "clinica";
    filterLabel: string;
    filterPlaceholder: string;
    datalistId: string;
    listTitle: string;
    entityColumn: string;
    emptyNone: string;
    emptyFiltered: string;
    invalidMonth: string;
    helpText: React.ReactNode;
    resumoEntidadeLabel: string;
    resumoPrevistoLabel: string;
    resumoEmitidoLabel: string;
    statusLabels: Record<FaturaMesStatus, string>;
    listIconTone: "blue" | "purple";
  }
> = {
  cliente: {
    filterField: "cliente",
    filterLabel: "Filtrar cliente (opcional)",
    filterPlaceholder: "Buscar cliente...",
    datalistId: "fatura-mes-clientes",
    listTitle: "Faturamento por cliente",
    entityColumn: "Cliente / Empresa",
    emptyNone: "Nenhum cliente com agendamentos faturáveis neste mês",
    emptyFiltered: " para o filtro informado",
    invalidMonth:
      "Informe um mês de referência válido (MM/AAAA) para listar os clientes faturáveis.",
    helpText: (
      <>
        Apenas agendamentos com status{" "}
        <strong className="font-semibold text-navy">agendado</strong> entram no
        faturamento. Os valores são calculados em tempo real a partir dos
        agendamentos do mês selecionado. Ao emitir, o vencimento é definido
        automaticamente para o{" "}
        <strong className="font-semibold text-navy">
          5º dia útil do mês seguinte
        </strong>
        .
      </>
    ),
    resumoEntidadeLabel: "Clientes faturáveis",
    resumoPrevistoLabel: "Previsto no mês",
    resumoEmitidoLabel: "Já emitido",
    statusLabels: FATURA_MES_STATUS_LABELS,
    listIconTone: "blue",
  },
  clinica: {
    filterField: "clinica",
    filterLabel: "Filtrar clínica (opcional)",
    filterPlaceholder: "Buscar clínica...",
    datalistId: "fatura-mes-clinicas",
    listTitle: "Custos por clínica",
    entityColumn: "Clínica",
    emptyNone: "Nenhuma clínica com custos conferíveis neste mês",
    emptyFiltered: " para o filtro informado",
    invalidMonth:
      "Informe um mês de referência válido (MM/AAAA) para listar as clínicas com custos.",
    helpText: (
      <>
        Apenas agendamentos com status{" "}
        <strong className="font-semibold text-navy">agendado</strong> entram no
        cálculo de custos. Os valores são calculados em tempo real a partir dos
        agendamentos do mês selecionado. Ao marcar como conferido, o vencimento
        é definido automaticamente para o{" "}
        <strong className="font-semibold text-navy">
          último dia do período de referência
        </strong>
        .
      </>
    ),
    resumoEntidadeLabel: "Clínicas com custo",
    resumoPrevistoLabel: "Previsto no mês",
    resumoEmitidoLabel: "Já conferido",
    statusLabels: FATURA_MES_STATUS_LABELS_CLINICA,
    listIconTone: "purple",
  },
};

function statusBadge(
  status: FaturaMesStatus,
  labels: Record<FaturaMesStatus, string>
) {
  const styles: Record<FaturaMesStatus, string> = {
    aberta_emissao: "bg-brand-orange-soft text-[#c96d00]",
    rascunho: "bg-[#fef3c7] text-[#b45309]",
    emitida: "bg-brand-blue-soft text-brand-blue",
    paga: "bg-brand-green-soft text-brand-green",
    cancelada: "bg-brand-red-soft text-brand-red",
  };

  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

interface FaturasMesPanelProps {
  variant: FaturaTipo;
  filters: FaturaFilters;
  options: { clientes: ClienteFilterOption[]; clinicas: string[] };
  rows: FaturaMesRow[];
  resumo: FaturaMesResumoGeral | null;
  mesValido: boolean;
  loading: boolean;
  saving: boolean;
  onChange: (field: keyof FaturaFilters, value: string) => void;
  onVisualizarAgendamentos: (referenciaNome: string) => void;
  onEmitir: (referenciaNome: string) => void;
  onVisualizarFatura: (id: string) => void;
  onGerarPdf: (id: string) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onEditarPagamento: (id: string) => void;
  onMarcarPendente: (id: string) => void;
  onVerComprovante?: (id: string) => void;
  onReemitir?: (id: string) => void;
  onReabrirConferencia?: (id: string) => void;
}

export function FaturasMesPanel({
  variant,
  filters,
  options,
  rows,
  resumo,
  mesValido,
  loading,
  saving,
  onChange,
  onVisualizarAgendamentos,
  onEmitir,
  onVisualizarFatura,
  onGerarPdf,
  onCancelar,
  onMarcarPago,
  onEditarPagamento,
  onMarcarPendente,
  onVerComprovante,
  onReemitir,
  onReabrirConferencia,
}: FaturasMesPanelProps) {
  const config = PANEL_CONFIG[variant];
  const disabled = loading || saving;
  const filterValue = filters[config.filterField];
  const ListIcon = variant === "clinica" ? IconWallet : IconReceipt;

  const resumoCards: {
    key: keyof FaturaMesResumoGeral;
    label: string;
    tone: string;
    format?: (v: number) => string;
  }[] = [
    {
      key: "totalReferencias",
      label: config.resumoEntidadeLabel,
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
      label: config.resumoPrevistoLabel,
      tone: "border-[#e8edf5] bg-white text-navy",
      format: formatCurrency,
    },
    {
      key: "valorEmitido",
      label: config.resumoEmitidoLabel,
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

  return (
    <div className="space-y-5">
      <Panel title="Mês de referência" icon={<IconSearch />}>
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3.5 sm:grid-cols-2">
          <Field label="Mês de referência">
            <MonthReferenceSelect
              value={filters.mesReferencia}
              disabled={disabled}
              allowEmpty
              onChange={(value) => onChange("mesReferencia", value)}
            />
            <p className="text-[10px] text-[#94a3b8]">
              Mês completo (ex.: 06/2026 = 01/06 a 30/06)
            </p>
          </Field>

          <Field label={config.filterLabel}>
            {variant === "cliente" ? (
              <>
                <input
                  className="field-input"
                  list={config.datalistId}
                  placeholder={config.filterPlaceholder}
                  value={filterValue}
                  disabled={disabled}
                  onChange={(e) => onChange(config.filterField, e.target.value)}
                />
                <datalist id={config.datalistId}>
                  {options.clientes.map((c) => (
                    <option key={c.value} value={c.value} label={c.label} />
                  ))}
                </datalist>
              </>
            ) : (
              <>
                <input
                  className="field-input"
                  list={config.datalistId}
                  placeholder={config.filterPlaceholder}
                  value={filterValue}
                  disabled={disabled}
                  onChange={(e) => onChange(config.filterField, e.target.value)}
                />
                <datalist id={config.datalistId}>
                  {options.clinicas.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]">
          {config.helpText}
        </p>
      </Panel>

      {mesValido && resumo && (
        <Panel title="Resumo do mês" icon={<IconReceipt />} iconTone="green">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
            {resumoCards.map((card) => {
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
        title={config.listTitle}
        icon={<ListIcon />}
        iconTone={config.listIconTone}
      >
        {loading && (
          <p className="py-6 text-center text-sm text-app-muted">
            Carregando agendamentos...
          </p>
        )}

        {!loading && !mesValido && (
          <p className="py-6 text-center text-sm text-app-muted">
            {config.invalidMonth}
          </p>
        )}

        {!loading && mesValido && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-app-muted">
            {config.emptyNone}
            {filterValue.trim() ? config.emptyFiltered : ""}.
          </p>
        )}

        {!loading && mesValido && rows.length > 0 && (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[920px] border-collapse">
              <thead>
                <tr className="border-b border-[#e2e8f0] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]">
                  {[
                    config.entityColumn,
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
                    key={row.referenciaNome}
                    className="border-b border-[#eef2f7]/80 transition-colors hover:bg-[#f0f4ff]/40"
                  >
                    <td
                      className="max-w-[180px] truncate px-2.5 py-2 text-xs font-semibold text-navy"
                      title={row.referenciaNome}
                    >
                      {row.referenciaNome}
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
                    <td className="px-2.5 py-2">
                      {statusBadge(row.status, config.statusLabels)}
                    </td>
                    <td className="px-2.5 py-2">
                      <FaturasMesRowActions
                        variant={variant}
                        row={row}
                        saving={saving}
                        onVisualizarAgendamentos={onVisualizarAgendamentos}
                        onEmitir={onEmitir}
                        onVisualizarFatura={onVisualizarFatura}
                        onGerarPdf={onGerarPdf}
                        onCancelar={onCancelar}
                        onMarcarPago={onMarcarPago}
                        onEditarPagamento={onEditarPagamento}
                        onMarcarPendente={onMarcarPendente}
                        onVerComprovante={onVerComprovante}
                        onReemitir={onReemitir}
                        onReabrirConferencia={onReabrirConferencia}
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
