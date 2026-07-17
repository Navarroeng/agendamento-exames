"use client";

import type { FaturaPendenciaInadimplencia } from "@/lib/fatura-inadimplencia";

interface AgendamentoClienteInadimplenciaModalProps {
  open: boolean;
  pendencias: FaturaPendenciaInadimplencia[];
  onClose: () => void;
}

export function AgendamentoClienteInadimplenciaModal({
  open,
  pendencias,
  onClose,
}: AgendamentoClienteInadimplenciaModalProps) {
  if (!open || pendencias.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cliente-inadimplencia-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fef2f2] to-white px-6 py-5">
          <h3
            id="cliente-inadimplencia-modal-title"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Cliente com pendência financeira
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            Este cliente possui uma ou mais faturas vencidas.
          </p>
        </div>

        <div className="max-h-[50vh] space-y-3 overflow-y-auto px-6 py-5">
          <ul className="space-y-3">
            {pendencias.map((pendencia) => (
              <li
                key={pendencia.id}
                className="rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#475569]"
              >
                <p>
                  <span className="font-semibold text-[#2d2a4a]">
                    Referência:
                  </span>{" "}
                  {pendencia.mesReferenciaBR}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-[#2d2a4a]">
                    Vencimento:
                  </span>{" "}
                  {pendencia.dataVencimentoBR}
                </p>
                <p className="mt-1">
                  <span className="font-semibold text-[#2d2a4a]">Valor:</span>{" "}
                  {pendencia.valorFormatado}
                </p>
              </li>
            ))}
          </ul>

          <p className="text-sm leading-relaxed text-[#64748b]">
            Enquanto houver faturas vencidas, novos agendamentos não poderão ser
            realizados.
          </p>
        </div>

        <div className="flex justify-end border-t border-[#e8edf5] bg-[#f8fafc] px-6 py-4">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
