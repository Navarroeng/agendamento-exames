"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";

interface ReabrirAgendamentosIniciaisModalProps {
  open: boolean;
  numeroContrato: string | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function ReabrirAgendamentosIniciaisModal({
  open,
  numeroContrato,
  saving,
  onClose,
  onConfirm,
}: ReabrirAgendamentosIniciaisModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setError(null);
  }, [open]);

  function handleConfirm() {
    if (!motivo.trim()) {
      setError("Informe o motivo da reabertura.");
      return;
    }
    onConfirm(motivo.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reabrir agendamentos iniciais"
      subtitle={numeroContrato ? `Contrato ${numeroContrato}` : undefined}
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
            className="btn btn-primary justify-center sm:w-auto"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? "Reabrindo..." : "Confirmar reabertura"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3 text-sm text-[#1e3a8a]">
          <p className="font-extrabold">
            Deseja reabrir a etapa de agendamentos iniciais?
          </p>
          <p className="mt-2 text-[13px] leading-relaxed">
            A dispensa será retirada, a implantação voltará para Aguardando
            agendamentos e a seleção de agendamentos será liberada novamente.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo da reabertura <RequiredMark />
          </label>
          <textarea
            className="field-input min-h-[88px] resize-y"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: Cliente voltou a solicitar os exames iniciais."
            disabled={saving}
          />
          {error ? (
            <p className="mt-1 text-[11px] font-medium text-brand-red">{error}</p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
