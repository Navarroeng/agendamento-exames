"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";

interface OrcamentoCancelarModalProps {
  open: boolean;
  numero: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string, observacao: string) => void;
}

export function OrcamentoCancelarModal({
  open,
  numero,
  saving,
  onClose,
  onConfirm,
}: OrcamentoCancelarModalProps) {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setObservacao("");
    setError(null);
  }, [open]);

  function handleConfirm() {
    if (!motivo.trim()) {
      setError("Informe o motivo do cancelamento.");
      return;
    }
    onConfirm(motivo.trim(), observacao.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancelar orçamento"
      subtitle={`Orçamento ${numero}`}
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Voltar
          </button>
          <button
            type="button"
            className="btn justify-center border-brand-red/30 bg-brand-red-soft text-brand-red hover:bg-[#fee2e2] sm:w-auto"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#475569]">
          O orçamento permanecerá visível no histórico com status{" "}
          <strong>Cancelado</strong>. Esta ação não exclui o registro.
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo do cancelamento <RequiredMark />
          </label>
          <input
            className="field-input"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: cliente desistiu da contratação"
            disabled={saving}
          />
          {error ? (
            <p className="mt-1 text-[11px] font-medium text-brand-red">{error}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Observações complementares
          </label>
          <textarea
            className="field-input min-h-[80px] resize-y"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            disabled={saving}
          />
        </div>
      </div>
    </Modal>
  );
}
