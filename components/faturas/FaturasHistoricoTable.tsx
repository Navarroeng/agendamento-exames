"use client";

import { Panel } from "@/components/ui/Panel";
import { IconClipboard } from "@/components/ui/icons/OutlineIcons";
import { AgendamentosPagination } from "@/components/agendamentos/AgendamentosPagination";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { historicoStatusLabelClinica } from "@/lib/custos-clinicas-conferencia";
import {
  FATURA_HISTORICO_PAGE_SIZE,
  type FaturaHistoricoFilters,
} from "@/lib/fatura-filters";
import { FATURA_MES_STATUS_LABELS } from "@/lib/fatura-mes-resumo";
import { formatCurrency } from "@/lib/money";
import type { FaturaRecord, FaturaStatus, FaturaTipo } from "@/lib/types";
import { FaturaRowActionsMenu } from "./FaturaRowActionsMenu";
import { FaturasHistoricoFilters } from "./FaturasHistoricoFilters";

function statusBadge(status: FaturaStatus, variant: FaturaTipo, pago: boolean) {
  const map: Record<FaturaStatus, string> = {
    rascunho: "bg-brand-orange-soft text-[#c96d00]",
    emitida: "bg-brand-green-soft text-brand-green",
    cancelada: "bg-brand-red-soft text-brand-red",
    necessita_reemissao: "bg-brand-orange-soft text-[#c96d00]",
    substituida: "bg-[#f1f5f9] text-[#64748b]",
    reemitida: "bg-[#f1f5f9] text-[#64748b]",
  };
  const labels: Record<FaturaStatus, string> =
    variant === "clinica"
      ? {
          rascunho: historicoStatusLabelClinica("rascunho", false),
          emitida: historicoStatusLabelClinica("emitida", pago),
          cancelada: historicoStatusLabelClinica("cancelada", false),
          necessita_reemissao: historicoStatusLabelClinica("emitida", pago),
          substituida: historicoStatusLabelClinica("cancelada", false),
          reemitida: historicoStatusLabelClinica("cancelada", false),
        }
      : {
          rascunho: "Rascunho",
          emitida: "Emitida",
          cancelada: "Cancelada",
          necessita_reemissao: FATURA_MES_STATUS_LABELS.necessita_reemissao,
          substituida: FATURA_MES_STATUS_LABELS.substituida,
          reemitida: FATURA_MES_STATUS_LABELS.reemitida,
        };
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${map[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function pagamentoBadge(fatura: FaturaRecord) {
  if (fatura.status !== "emitida") {
    return <span className="text-[10px] text-[#94a3b8]">—</span>;
  }

  if (fatura.pago && fatura.data_pagamento) {
    return (
      <span className="inline-block rounded-md bg-brand-green-soft px-2 py-0.5 text-[10px] font-bold text-brand-green">
        Pago em {formatDateIsoToBR(fatura.data_pagamento)}
      </span>
    );
  }

  return (
    <span className="inline-block rounded-md bg-brand-orange-soft px-2 py-0.5 text-[10px] font-bold text-[#c96d00]">
      Pendente
    </span>
  );
}

const TABLE_META: Record<
  FaturaTipo,
  { title: string; emptyNone: string; emptyFiltered: string }
> = {
  cliente: {
    title: "Histórico de faturas",
    emptyNone:
      "Nenhuma fatura emitida ainda. Use os filtros acima para gerar a primeira fatura.",
    emptyFiltered:
      "Nenhuma fatura encontrada com os filtros selecionados.",
  },
  clinica: {
    title: "Histórico de custos",
    emptyNone:
      "Nenhum custo conferido ainda. Use os filtros acima para marcar o primeiro como conferido.",
    emptyFiltered:
      "Nenhum custo encontrado com os filtros selecionados.",
  },
};

interface FaturasHistoricoTableProps {
  variant: FaturaTipo;
  faturas: FaturaRecord[];
  totalFiltradas: number;
  totalGeral: number;
  historicoFilters: FaturaHistoricoFilters;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onHistoricoFilterChange: (
    field: keyof FaturaHistoricoFilters,
    value: string
  ) => void;
  onClearHistoricoFilters: () => void;
  onVisualizar: (id: string) => void;
  onGerarPdf: (id: string) => void;
  onCancelar: (id: string) => void;
  onMarcarPago: (id: string) => void;
  onEditarPagamento: (id: string) => void;
  onMarcarPendente: (id: string) => void;
}

export function FaturasHistoricoTable({
  variant,
  faturas,
  totalFiltradas,
  totalGeral,
  historicoFilters,
  loading,
  page,
  totalPages,
  onPageChange,
  onHistoricoFilterChange,
  onClearHistoricoFilters,
  onVisualizar,
  onGerarPdf,
  onCancelar,
  onMarcarPago,
  onEditarPagamento,
  onMarcarPendente,
}: FaturasHistoricoTableProps) {
  const meta = TABLE_META[variant];
  const emptyMessage =
    totalGeral === 0 ? meta.emptyNone : meta.emptyFiltered;

  const headers = [
    "Número",
    ...(variant ? [] : ["Tipo"]),
    "Referência",
    "Período",
    "Emissão",
    "Vencimento",
    "Total",
    "Exames",
    "Status",
    "Pagamento",
    "Gerado por",
    "Ações",
  ];

  return (
    <Panel title={meta.title} icon={<IconClipboard />} iconTone="purple">
      <FaturasHistoricoFilters
        fixedTipo={variant}
        filters={historicoFilters}
        totalFiltradas={totalFiltradas}
        totalGeral={totalGeral}
        disabled={loading}
        onChange={onHistoricoFilterChange}
        onClear={onClearHistoricoFilters}
      />

      {loading && (
        <p className="py-6 text-center text-sm text-app-muted">
          Carregando histórico...
        </p>
      )}

      {!loading && totalFiltradas === 0 && (
        <p className="py-6 text-center text-sm text-app-muted">{emptyMessage}</p>
      )}

      {!loading && totalFiltradas > 0 && (
        <>
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[1040px] border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f0] bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9]">
                {headers.map((h) => (
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
              {faturas.map((f) => {
                const periodo =
                  f.periodo_inicio && f.periodo_fim
                    ? `${formatDateIsoToBR(f.periodo_inicio)} a ${formatDateIsoToBR(f.periodo_fim)}`
                    : f.periodo_inicio
                      ? formatDateIsoToBR(f.periodo_inicio)
                      : "—";

                const faturaComPagamento: FaturaRecord = {
                  ...f,
                  pago: f.pago ?? false,
                };

                return (
                  <tr
                    key={f.id}
                    className="border-b border-[#eef2f7]/80 transition-colors hover:bg-[#f0f4ff]/40"
                  >
                    <td className="px-2.5 py-2 text-xs font-semibold text-navy">
                      {f.numero}
                    </td>
                    <td
                      className="max-w-[140px] truncate px-2.5 py-2 text-xs text-[#475569]"
                      title={f.referencia_nome}
                    >
                      {f.referencia_nome}
                    </td>
                    <td className="px-2.5 py-2 text-xs text-[#64748b]">
                      {periodo}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-xs text-[#64748b]">
                      {f.data_emissao
                        ? formatDateIsoToBR(f.data_emissao.split("T")[0])
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-xs text-[#64748b]">
                      {formatDateIsoToBR(f.data_vencimento)}
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 text-xs font-semibold text-navy">
                      {formatCurrency(Number(f.valor_total))}
                    </td>
                    <td className="px-2.5 py-2 text-xs text-[#64748b]">
                      {f.total_exames}
                    </td>
                    <td className="px-2.5 py-2">
                      {statusBadge(f.status, variant, faturaComPagamento.pago ?? false)}
                    </td>
                    <td className="px-2.5 py-2">
                      {pagamentoBadge(faturaComPagamento)}
                    </td>
                    <td
                      className="max-w-[100px] truncate px-2.5 py-2 text-xs text-[#64748b]"
                      title={f.gerado_por ?? ""}
                    >
                      {f.gerado_por ?? "—"}
                    </td>
                    <td className="px-2.5 py-2">
                      <FaturaRowActionsMenu
                        fatura={faturaComPagamento}
                        variant={variant}
                        onVisualizar={onVisualizar}
                        onGerarPdf={onGerarPdf}
                        onCancelar={onCancelar}
                        onMarcarPago={onMarcarPago}
                        onEditarPagamento={onEditarPagamento}
                        onMarcarPendente={onMarcarPendente}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

          <AgendamentosPagination
            page={page}
            totalPages={totalPages}
            totalItems={totalFiltradas}
            pageSize={FATURA_HISTORICO_PAGE_SIZE}
            onPageChange={onPageChange}
          />
        </>
      )}
    </Panel>
  );
}
