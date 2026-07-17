"use client";

import { useEffect, useState } from "react";
import { NavarroLogo } from "@/components/layout/NavarroLogo";
import { formatCNPJ } from "@/lib/cnpj";
import type { FaturaPendenciaInadimplencia } from "@/lib/fatura-inadimplencia";

export interface InadimplenciaClienteInfo {
  razaoSocial: string;
  cnpj: string;
}

interface AgendamentoClienteInadimplenciaModalProps {
  open: boolean;
  pendencias: FaturaPendenciaInadimplencia[];
  cliente: InadimplenciaClienteInfo | null;
  onClose: () => void;
}

function formatConsultaDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function FaturaCard({ pendencia }: { pendencia: FaturaPendenciaInadimplencia }) {
  return (
    <article className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-[0_4px_24px_rgba(11,31,77,0.06)]">
      <div className="h-1 bg-gradient-to-r from-[#0b1f4d] via-[#d4af37] to-[#0b1f4d]" />
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Referência
          </p>
          <p className="mt-1 text-base font-bold text-[#0b1f4d]">
            {pendencia.mesReferenciaBR}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Valor
          </p>
          <p className="mt-1 text-base font-bold text-[#0b1f4d]">
            {pendencia.valorFormatado}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Data de vencimento
          </p>
          <p className="mt-1 text-sm font-semibold text-[#334155]">
            {pendencia.dataVencimentoBR}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Status
          </p>
          <p className="mt-1.5">
            <span className="inline-flex items-center rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#b91c1c]">
              Fatura vencida
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

export function AgendamentoClienteInadimplenciaModal({
  open,
  pendencias,
  cliente,
  onClose,
}: AgendamentoClienteInadimplenciaModalProps) {
  const [consultadoEm, setConsultadoEm] = useState<Date | null>(null);

  useEffect(() => {
    if (open) setConsultadoEm(new Date());
  }, [open]);

  if (!open || pendencias.length === 0) return null;

  const razaoSocial = cliente?.razaoSocial?.trim() || "—";
  const cnpjLabel = formatCNPJ(cliente?.cnpj);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#0b1f4d]/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_32px_64px_rgba(11,31,77,0.28)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pendencia-financeira-title"
      >
        {/* Cabeçalho institucional */}
        <header className="relative shrink-0 bg-[#0b1f4d] px-6 pb-5 pt-6 sm:px-8 sm:pt-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 100% 0%, #d4af37 0%, transparent 55%)",
            }}
          />
          <div className="relative flex flex-col items-center text-center">
            <div className="rounded-xl bg-white/95 px-5 py-2.5 shadow-lg">
              <NavarroLogo size="default" priority className="!h-9" />
            </div>
            <div className="mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
            <h2
              id="pendencia-financeira-title"
              className="mt-4 text-xl font-extrabold tracking-wide text-white sm:text-[1.35rem]"
            >
              Pendência Financeira
            </h2>
            <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.2em] text-[#d4af37]/90">
              Aviso financeiro
            </p>
          </div>
        </header>

        {/* Conteúdo — área ideal para print */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fafbfc] px-6 py-6 sm:px-8">
          <section className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
              Empresa
            </p>
            <p className="mt-2 text-lg font-extrabold leading-snug text-[#0b1f4d]">
              {razaoSocial}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#f8fafc] px-3 py-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
                CNPJ
              </span>
              <span className="text-sm font-semibold tabular-nums text-[#334155]">
                {cnpjLabel}
              </span>
            </div>
          </section>

          <div className="mt-5 space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#64748b]">
              {pendencias.length === 1
                ? "Fatura em aberto"
                : `Faturas em aberto (${pendencias.length})`}
            </p>
            {pendencias.map((pendencia) => (
              <FaturaCard key={pendencia.id} pendencia={pendencia} />
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-[#dbeafe] bg-gradient-to-br from-[#f8fafc] to-white p-5">
            <p className="text-sm leading-relaxed text-[#475569]">
              Conforme a{" "}
              <span className="font-semibold text-[#0b1f4d]">
                política financeira da Navarro Engenharia
              </span>
              , novos agendamentos permanecem{" "}
              <span className="font-semibold text-[#0b1f4d]">bloqueados</span>{" "}
              enquanto existirem faturas com status vencido. Regularize o
              pagamento para restabelecer o agendamento de exames.
            </p>
          </div>
        </div>

        {/* Rodapé com data da consulta */}
        <footer className="shrink-0 border-t border-[#e2e8f0] bg-white px-6 py-3 text-center sm:px-8">
          <p className="text-[11px] font-medium text-[#94a3b8]">
            Consulta realizada em{" "}
            <span className="font-semibold text-[#64748b]">
              {consultadoEm ? formatConsultaDateTime(consultadoEm) : "—"}
            </span>
          </p>
        </footer>

        {/* Ações */}
        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-4 sm:flex-row sm:justify-end sm:px-8">
          <button type="button" className="btn justify-center sm:min-w-[120px]" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="btn justify-center border border-[#0b1f4d] bg-[#0b1f4d] text-white shadow-[0_8px_20px_rgba(11,31,77,0.25)] hover:bg-[#12316f] sm:min-w-[120px]"
            onClick={onClose}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
