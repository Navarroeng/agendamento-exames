"use client";

import { createPortal } from "react-dom";
import type { ContratoAptoAgendamento } from "@/services/contrato-agendamentos.service";

interface ContratoAgendamentoSelectModalProps {
  open: boolean;
  opcoes: ContratoAptoAgendamento[];
  saving?: boolean;
  onSelect: (contratoId: string) => void;
  onCancel: () => void;
}

export function ContratoAgendamentoSelectModal({
  open,
  opcoes,
  saving,
  onSelect,
  onCancel,
}: ContratoAgendamentoSelectModalProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        onClick={() => {
          if (!saving) onCancel();
        }}
        aria-label="Fechar"
      />
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-[#eef2f7] px-5 py-4">
          <h3 className="text-base font-extrabold text-navy">
            Selecione o contrato
          </h3>
          <p className="mt-1 text-sm text-[#64748b]">
            Este cliente possui mais de um contrato apto. Escolha onde
            contabilizar o agendamento.
          </p>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
          {opcoes.map((op) => (
            <button
              key={op.contrato.id}
              type="button"
              disabled={saving}
              onClick={() => onSelect(op.contrato.id)}
              className="w-full rounded-xl border border-[#e4ebf4] bg-[#f8fafc] px-4 py-3 text-left transition hover:border-brand-blue hover:bg-[#eff6ff] disabled:opacity-60"
            >
              <p className="text-sm font-extrabold text-navy">
                {op.contrato.numero || "Contrato sem número"}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-[#475569]">
                {op.contrato.numero_orcamento || "Orçamento —"}
              </p>
              <p className="mt-2 text-xs text-[#64748b]">
                {op.contratados} colaboradores contratados · {op.realizados}{" "}
                agendamentos realizados · {op.disponiveis} disponíveis
              </p>
            </button>
          ))}
        </div>
        <div className="flex justify-end border-t border-[#eef2f7] px-4 py-3">
          <button
            type="button"
            className="btn"
            disabled={saving}
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
