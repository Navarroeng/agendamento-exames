"use client";

import Link from "next/link";
import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { rotuloParcelaCobranca } from "@/lib/cobrancas-mensalidades";
import {
  MENSALIDADE_ATRASO_BLOQUEIO_MSG,
  MENSALIDADE_ATRASO_BLOQUEIO_TITULO,
  MENSALIDADE_ATRASO_PORTAL_MSG,
  hrefCobrancasPendenciasEmpresa,
  type ParcelaMensalidadeBloqueante,
} from "@/lib/agendamento-mensalidade-bloqueio";
import { formatCurrency } from "@/lib/money";

interface AgendamentoMensalidadeBloqueioModalProps {
  open: boolean;
  empresa: string;
  parcelas: ParcelaMensalidadeBloqueante[];
  /** Área interna. No portal o link de Cobranças não aparece. */
  podeAbrirCobrancas?: boolean;
  onClose: () => void;
}

function rotuloDias(dias: number): string {
  return dias === 1 ? "1 dia de atraso" : `${dias} dias de atraso`;
}

export function AgendamentoMensalidadeBloqueioModal({
  open,
  empresa,
  parcelas,
  podeAbrirCobrancas = false,
  onClose,
}: AgendamentoMensalidadeBloqueioModalProps) {
  if (!open) return null;
  const empresaInformada = empresa.trim();
  const nome = empresaInformada || "Esta empresa";
  const texto = podeAbrirCobrancas
    ? MENSALIDADE_ATRASO_BLOQUEIO_MSG
    : MENSALIDADE_ATRASO_PORTAL_MSG;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0b1f4d]/55"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mensalidade-bloqueio-titulo"
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      >
        <div className="border-b border-[#e2e8f0] px-6 py-5">
          <h2
            id="mensalidade-bloqueio-titulo"
            className="text-lg font-extrabold text-[#0b1f4d]"
          >
            {MENSALIDADE_ATRASO_BLOQUEIO_TITULO}
          </h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#334155]">
            {texto}
          </p>
          <p className="mt-3 text-sm font-bold text-[#0b1f4d]">{nome}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {parcelas.map((parcela) => (
            <article
              key={parcela.id}
              className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm"
            >
              <p className="font-bold text-[#991b1b]">
                Parcela {rotuloParcelaCobranca(parcela.numero)}
              </p>
              <p className="mt-1 text-[#7f1d1d]">
                Vencimento {formatDateIsoToBR(parcela.vencimentoIso)}
              </p>
              <p className="text-[#7f1d1d]">
                Valor {formatCurrency(parcela.valor)}
              </p>
              <p className="font-semibold text-[#991b1b]">
                {rotuloDias(parcela.diasAtraso)}
              </p>
            </article>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-[#e2e8f0] bg-[#f8fafc] px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn justify-center" onClick={onClose}>
            Fechar
          </button>
          {podeAbrirCobrancas ? (
            <Link
              href={hrefCobrancasPendenciasEmpresa(empresaInformada)}
              className="btn btn-primary justify-center"
            >
              Abrir Cobranças
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
