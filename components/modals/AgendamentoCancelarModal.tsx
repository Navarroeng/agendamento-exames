"use client";

import { useEffect, useState } from "react";

interface AgendamentoCancelarModalProps {
  open: boolean;
  variant?: "normal" | "excepcional";
  onClose: () => void;
  onConfirm: (motivo: string) => void;
  saving?: boolean;
}

export function AgendamentoCancelarModal({
  open,
  variant = "normal",
  onClose,
  onConfirm,
  saving = false,
}: AgendamentoCancelarModalProps) {
  const [motivo, setMotivo] = useState("");
  const isExcepcional = variant === "excepcional";

  useEffect(() => {
    if (open) setMotivo("");
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (saving) return;
    setMotivo("");
    onClose();
  };

  const handleConfirm = () => {
    if (!motivo.trim()) return;
    onConfirm(motivo.trim());
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fef2f2] to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fef2f2] text-lg text-[#dc2626]">
              ✕
            </div>
            <div>
              <h3
                id="cancel-modal-title"
                className="text-lg font-extrabold text-[#2d2a4a]"
              >
                {isExcepcional
                  ? "Cancelamento excepcional"
                  : "Cancelar agendamento"}
              </h3>
              <p className="mt-1 text-sm text-[#8b95a8]">
                {isExcepcional
                  ? "Este agendamento está vinculado a uma fatura já emitida. O cancelamento irá exigir reemissão ou correção da fatura do cliente. Deseja continuar?"
                  : "Informe o motivo do cancelamento para registro no sistema."}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <label
            htmlFor="motivo-cancelamento"
            className="mb-2 block text-[13px] font-bold text-[#253454]"
          >
            {isExcepcional
              ? "Motivo do cancelamento excepcional"
              : "Motivo do cancelamento"}{" "}
            <span className="text-brand-red">*</span>
          </label>
          <textarea
            id="motivo-cancelamento"
            className="field-input !h-[120px] w-full resize-none py-3"
            placeholder="Descreva o motivo do cancelamento..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#e8edf5] bg-[#f8f9fc] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={handleClose}
            disabled={saving}
          >
            Voltar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[14px] border border-transparent bg-[#dc2626] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.25)] transition hover:bg-[#b91c1c] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleConfirm}
            disabled={saving || !motivo.trim()}
          >
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
