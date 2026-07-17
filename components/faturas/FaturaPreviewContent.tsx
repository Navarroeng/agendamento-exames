"use client";

import { NavarroLogo } from "@/components/layout/NavarroLogo";
import {
  calcTotalFaturaItens,
  countColaboradoresItens,
} from "@/lib/fatura-mappers";
import { formatDateBR } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import { FATURA_MES_STATUS_LABELS_CLINICA } from "@/lib/custos-clinicas-conferencia";
import { FATURA_MES_STATUS_LABELS } from "@/lib/fatura-mes-resumo";
import type { FaturaPreviewState, FaturaStatus } from "@/lib/types";

import { FaturaPagamentoCard } from "./FaturaPagamentoCard";
import { FaturaResumoPorTipoExame } from "./FaturaResumoPorTipoExame";

function statusLabel(
  status: FaturaStatus | null,
  tipo: FaturaPreviewState["tipo"]
): string {
  if (tipo === "clinica") {
    if (status === "cancelada") return FATURA_MES_STATUS_LABELS_CLINICA.cancelada;
    if (status === "rascunho")
      return FATURA_MES_STATUS_LABELS_CLINICA.rascunho;
    if (status === "emitida") return FATURA_MES_STATUS_LABELS_CLINICA.emitida;
    return "Pré-visualização";
  }
  if (status === "necessita_reemissao")
    return FATURA_MES_STATUS_LABELS.necessita_reemissao;
  if (status === "substituida") return FATURA_MES_STATUS_LABELS.substituida;
  if (status === "reemitida") return FATURA_MES_STATUS_LABELS.reemitida;
  if (status === "vencida") return FATURA_MES_STATUS_LABELS.vencida;
  if (status === "emitida") return "Emitida";
  if (status === "cancelada") return "Cancelada";
  if (status === "rascunho") return "Rascunho";
  return "Pré-visualização";
}

function statusClass(status: FaturaStatus | null): string {
  if (status === "necessita_reemissao")
    return "bg-brand-orange-soft text-[#c96d00]";
  if (status === "reemitida") return "bg-[#f1f5f9] text-[#64748b]";
  if (status === "substituida") return "bg-[#f1f5f9] text-[#64748b]";
  if (status === "vencida") return "bg-brand-red-soft text-brand-red";
  if (status === "emitida") return "bg-brand-green-soft text-brand-green";
  if (status === "cancelada") return "bg-brand-red-soft text-brand-red";
  if (status === "rascunho") return "bg-brand-orange-soft text-[#c96d00]";
  return "bg-brand-blue-soft text-brand-blue";
}

interface FaturaPreviewContentProps {
  preview: FaturaPreviewState;
  onAbrirFaturaRelacionada?: (faturaId: string) => void;
  onVerFaturaClinica?: (faturaId: string) => void;
}

export function FaturaPreviewContent({
  preview,
  onAbrirFaturaRelacionada,
  onVerFaturaClinica,
}: FaturaPreviewContentProps) {
  const total = calcTotalFaturaItens(preview.itens);
  const colaboradores = countColaboradoresItens(preview.itens);
  const isCliente = preview.tipo === "cliente";

  const headers = isCliente
    ? ["Data", "Colaborador", "ASO", "Exame", "V. Unit.", "Qtd", "Total"]
    : [
        "Data",
        "Colaborador",
        "Cliente",
        "ASO",
        "Exame",
        "V. Unit.",
        "Qtd",
        "Total",
      ];

  return (
    <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      {isCliente &&
      (preview.status === "substituida" || preview.status === "reemitida") &&
      preview.faturaSubstitutaNumero ? (
        <div className="border-b border-[#fde68a] bg-[#fffbeb] px-5 py-3 text-sm font-medium text-[#92400e]">
          Esta fatura foi reemitida. A fatura válida atual é{" "}
          {preview.faturaSubstitutaId && onAbrirFaturaRelacionada ? (
            <button
              type="button"
              className="font-bold underline hover:text-[#b45309]"
              onClick={() => onAbrirFaturaRelacionada(preview.faturaSubstitutaId!)}
            >
              {preview.faturaSubstitutaNumero}
            </button>
          ) : (
            preview.faturaSubstitutaNumero
          )}
          .
        </div>
      ) : null}
      {isCliente && preview.faturaOrigemNumero ? (
        <div className="border-b border-[#dbeafe] bg-[#f0f4ff] px-5 py-3 text-sm font-medium text-[#1e40af]">
          Esta fatura substitui a fatura{" "}
          {preview.faturaOrigemId && onAbrirFaturaRelacionada ? (
            <button
              type="button"
              className="font-bold underline hover:text-brand-blue"
              onClick={() => onAbrirFaturaRelacionada(preview.faturaOrigemId!)}
            >
              {preview.faturaOrigemNumero}
            </button>
          ) : (
            preview.faturaOrigemNumero
          )}
          .
        </div>
      ) : null}
      {isCliente && preview.status === "necessita_reemissao" ? (
        <div className="border-b border-[#fde68a] bg-[#fffbeb] px-5 py-3 text-sm font-medium text-[#92400e]">
          Esta fatura possui alteração após emissão. Reemitir a fatura para
          gerar o PDF correto.
        </div>
      ) : null}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#162a6c] to-[#1e3a8a] px-6 py-5 text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="rounded-xl bg-white px-4 py-2.5">
            <NavarroLogo size="default" />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              {isCliente
                ? "Fatura de exames ocupacionais"
                : "Relatório de pagamento da clínica"}
            </p>
            <p className="mt-1 text-sm font-bold text-[#f5d77a]">
              {preview.numero ?? "Nº provisório na emissão"}
            </p>
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusClass(preview.status)}`}
            >
              {statusLabel(preview.status, preview.tipo)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-b border-[#eef2f7] bg-[#f8fafc] px-5 py-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#e8edf5] bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {isCliente ? "Destinatário" : "Clínica"}
          </p>
          <p className="mt-1 text-sm font-bold text-navy">
            {preview.referenciaNome}
          </p>
        </div>
        <div className="rounded-xl border border-[#e8edf5] bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {isCliente ? "Período · Vencimento" : "Período de referência"}
          </p>
          <p className="mt-1 text-sm font-semibold text-navy">
            {preview.periodoLabel}
          </p>
          {isCliente && (
            <p className="text-xs text-[#64748b]">
              Vencimento: {preview.data_vencimento_label}
            </p>
          )}
        </div>
      </div>

      <div
        className={`grid grid-cols-2 gap-2 border-b border-[#eef2f7] px-5 py-3 ${
          isCliente ? "sm:grid-cols-4" : "sm:grid-cols-3"
        }`}
      >
        {(isCliente
          ? [
              { l: "Colaboradores", v: String(colaboradores) },
              { l: "Exames", v: String(preview.itens.length) },
              { l: "Valor total", v: formatCurrency(total) },
              { l: "Vencimento", v: preview.data_vencimento_label },
            ]
          : [
              { l: "Colaboradores", v: String(colaboradores) },
              { l: "Exames", v: String(preview.itens.length) },
              { l: "Total de custo", v: formatCurrency(total) },
            ]
        ).map((s) => (
          <div
            key={s.l}
            className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2"
          >
            <p className="text-[9px] font-bold uppercase text-[#94a3b8]">
              {s.l}
            </p>
            <p className="text-sm font-bold text-navy">{s.v}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto px-5 py-4">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="bg-[#1e2660] text-[10px] font-bold uppercase tracking-wide text-white">
              {headers.map((h) => (
                <th key={h} className="px-2 py-2 first:rounded-tl-lg last:rounded-tr-lg">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.itens.map((item, idx) => {
              const row = isCliente
                ? [
                    formatDateBR(item.data_agendamento),
                    item.colaborador,
                    item.tipo_aso,
                    item.exame_nome,
                    formatCurrency(item.valor_unitario),
                    String(item.quantidade),
                    formatCurrency(item.valor_total),
                  ]
                : [
                    formatDateBR(item.data_agendamento),
                    item.colaborador,
                    item.cliente_nome,
                    item.tipo_aso,
                    item.exame_nome,
                    formatCurrency(item.valor_unitario),
                    String(item.quantidade),
                    formatCurrency(item.valor_total),
                  ];

              return (
                <tr
                  key={`${item.agendamento_id}-${item.exame_nome}-${idx}`}
                  className={idx % 2 === 0 ? "bg-white" : "bg-[#f8fafc]"}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="border-b border-[#eef2f7] px-2 py-1.5 text-[11px] text-[#334155]"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!isCliente && <FaturaResumoPorTipoExame itens={preview.itens} />}

      {!isCliente &&
        preview.status === "emitida" &&
        (preview.conferido_em || preview.fatura_clinica_nome) && (
          <div className="border-t border-[#eef2f7] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Conferência
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {preview.conferido_em && (
                <div className="rounded-xl border border-[#e8edf5] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase text-[#94a3b8]">
                    Data da conferência
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy">
                    {formatDateBR(preview.conferido_em)}
                  </p>
                </div>
              )}
              {preview.conferido_por && (
                <div className="rounded-xl border border-[#e8edf5] bg-white p-3">
                  <p className="text-[10px] font-bold uppercase text-[#94a3b8]">
                    Conferido por
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy">
                    {preview.conferido_por}
                  </p>
                </div>
              )}
              {preview.fatura_clinica_nome && (
                <div className="rounded-xl border border-[#e8edf5] bg-white p-3 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase text-[#94a3b8]">
                    Fatura da clínica
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <p className="text-sm font-semibold text-navy">
                      {preview.fatura_clinica_nome}
                    </p>
                    {preview.faturaId &&
                      preview.fatura_clinica_path &&
                      onVerFaturaClinica && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-brand-blue hover:underline"
                          onClick={() => onVerFaturaClinica(preview.faturaId!)}
                        >
                          Ver fatura
                        </button>
                      )}
                  </div>
                </div>
              )}
              {preview.observacao_conferencia?.trim() && (
                <div className="rounded-xl border border-[#e8edf5] bg-white p-3 sm:col-span-2">
                  <p className="text-[10px] font-bold uppercase text-[#94a3b8]">
                    Observação da conferência
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#475569]">
                    {preview.observacao_conferencia}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      <div className="flex justify-end border-t border-[#eef2f7] bg-[#f8fafc] px-5 py-3">
        <div className="flex overflow-hidden rounded-lg border border-[#dbeafe]">
          <div className="bg-[#dbeafe] px-4 py-2 text-xs font-bold text-navy">
            TOTAL GERAL
          </div>
          <div className="bg-[#1e2660] px-5 py-2 text-base font-bold text-white">
            {formatCurrency(total)}
          </div>
        </div>
      </div>

      {isCliente && (
        <div className="grid gap-3 border-t border-[#eef2f7] px-5 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase text-navy">
              Observações
            </p>
            <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-[#64748b]">
              <li>Valores referentes a exames ocupacionais no período.</li>
              <li>Pagamento conforme condições comerciais acordadas.</li>
              <li>Documento gerado pelo sistema Navarro Engenharia.</li>
            </ul>
          </div>
          <FaturaPagamentoCard />
        </div>
      )}
    </div>
  );
}
