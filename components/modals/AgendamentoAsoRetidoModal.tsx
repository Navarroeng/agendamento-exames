"use client";

import { useEffect, useRef, useState } from "react";

interface AgendamentoAsoRetidoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File, observacao: string) => void;
  saving?: boolean;
}

export function AgendamentoAsoRetidoModal({
  open,
  onClose,
  onConfirm,
  saving = false,
}: AgendamentoAsoRetidoModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFile(null);
      setObservacao("");
      setFileError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleFileChange = (next: File | null) => {
    setFile(next);
    setFileError(null);
  };

  const handleConfirm = () => {
    if (!file) {
      setFileError("Selecione um arquivo para anexar.");
      return;
    }
    onConfirm(file, observacao.trim());
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
        aria-labelledby="aso-retido-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fff7ed] to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fff7ed] text-lg text-[#ea580c]">
              ⏸
            </div>
            <div>
              <h3
                id="aso-retido-modal-title"
                className="text-lg font-extrabold text-[#2d2a4a]"
              >
                ASO Retido
              </h3>
              <p className="mt-1 text-sm text-[#8b95a8]">
                Anexe o documento e informe, se necessário, o motivo da retenção.
                O agendamento continua válido para faturamento.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label
              htmlFor="aso-retido-anexo"
              className="mb-2 block text-[13px] font-bold text-[#253454]"
            >
              Anexo <span className="text-brand-red">*</span>
            </label>
            <input
              ref={inputRef}
              id="aso-retido-anexo"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*"
              className="field-input w-full cursor-pointer file:mr-3 file:rounded-lg file:border-0 file:bg-[#fff7ed] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#ea580c]"
              disabled={saving}
              onChange={(e) =>
                handleFileChange(e.target.files?.[0] ?? null)
              }
            />
            <p className="mt-1.5 text-[11px] text-[#94a3b8]">
              PDF, imagem ou documento (DOC/DOCX). Máximo 5 MB.
            </p>
            {file ? (
              <p className="mt-1 text-[12px] font-medium text-[#475569]">
                Selecionado: {file.name}
              </p>
            ) : null}
            {fileError ? (
              <p className="mt-1 text-[12px] font-medium text-brand-red">
                {fileError}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="aso-retido-observacao"
              className="mb-2 block text-[13px] font-bold text-[#253454]"
            >
              Observações
            </label>
            <textarea
              id="aso-retido-observacao"
              className="field-input !h-[100px] w-full resize-none py-3"
              placeholder="Motivo da retenção (opcional)..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#e8edf5] bg-[#f8f9fc] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={handleClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[14px] border border-transparent bg-[#ea580c] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(234,88,12,0.25)] transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
