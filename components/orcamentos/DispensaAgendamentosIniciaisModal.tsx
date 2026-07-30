"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { RequiredMark } from "@/components/ui/Field";

const MOTIVO_EXEMPLOS = [
  "Cliente não possui colaboradores para agendar no momento",
  "Cliente realizará os exames posteriormente",
  "Cliente optou por utilizar outra clínica",
  "Exames iniciais não serão realizados",
];

interface DispensaAgendamentosIniciaisModalProps {
  open: boolean;
  quantidadePrevista: number;
  numeroContrato: string | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

export function DispensaAgendamentosIniciaisModal({
  open,
  quantidadePrevista,
  numeroContrato,
  saving,
  onClose,
  onConfirm,
}: DispensaAgendamentosIniciaisModalProps) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMotivo("");
    setError(null);
  }, [open]);

  function handleConfirm() {
    if (!motivo.trim()) {
      setError("Informe o motivo / observação.");
      return;
    }
    onConfirm(motivo.trim());
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dispensar agendamentos iniciais"
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
            {saving ? "Confirmando..." : "Confirmar opção"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
          <p className="font-extrabold">
            O cliente optou por não realizar os agendamentos iniciais previstos
            no contrato. Deseja confirmar?
          </p>
          <p className="mt-2 text-[13px] leading-relaxed">
            A etapa Agendamentos será concluída sem consumir a quantidade
            prevista ({quantidadePrevista || "—"}). Novos agendamentos
            continuarão permitidos, mas serão classificados como adicionais.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold text-navy">
            Motivo / observação <RequiredMark />
          </label>
          <textarea
            className="field-input min-h-[88px] resize-y"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            placeholder="Ex.: Cliente não possui colaboradores para agendar no momento"
            disabled={saving}
          />
          {error ? (
            <p className="mt-1 text-[11px] font-medium text-brand-red">{error}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {MOTIVO_EXEMPLOS.map((ex) => (
              <button
                key={ex}
                type="button"
                className="rounded-full border border-[#e2e8f0] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#475569] hover:border-brand-blue/40 hover:text-brand-blue disabled:opacity-50"
                disabled={saving}
                onClick={() => {
                  setMotivo(ex);
                  setError(null);
                }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
