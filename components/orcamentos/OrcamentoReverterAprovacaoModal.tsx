"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";
import {
  motivoReversaoInvalido,
  textoConfirmacaoReverterAprovacao,
} from "@/lib/orcamento-reverter-aprovacao";

interface OrcamentoReverterAprovacaoModalProps {
  open: boolean;
  numero: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function OrcamentoReverterAprovacaoModal({
  open,
  numero,
  saving,
  onClose,
  onConfirm,
}: OrcamentoReverterAprovacaoModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setError(null);
  }, [open]);

  function handleConfirm() {
    const invalido = motivoReversaoInvalido(motivo);
    if (invalido) {
      setError(invalido);
      return;
    }
    onConfirm(motivo.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reverter aprovação?"
      subtitle={numero ? `Orçamento ${numero}` : undefined}
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary justify-center sm:w-auto"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Revertendo..." : "Reverter aprovação"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#475569]">
          {textoConfirmacaoReverterAprovacao()}
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo da reversão <RequiredMark />
          </label>
          <textarea
            className="field-input min-h-[88px] resize-y"
            value={motivo}
            disabled={saving}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Descreva por que a aprovação deve ser desfeita."
          />
        </div>
        {error ? (
          <p className="text-[12px] font-medium text-brand-red">{error}</p>
        ) : null}
      </div>
    </Modal>
  );
}
