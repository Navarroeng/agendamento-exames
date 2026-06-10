"use client";

import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { maskDateBR } from "@/lib/agendamento-datetime";
import {
  RECIBO_MASKED_LENGTH,
  maskEsocialRecibo,
} from "@/lib/esocial-recibo";

interface ESocialMarcarEnviadoModalProps {
  open: boolean;
  saving: boolean;
  dataEnvio: string;
  recibo: string;
  onChangeData: (value: string) => void;
  onChangeRecibo: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ESocialMarcarEnviadoModal({
  open,
  saving,
  dataEnvio,
  recibo,
  onChangeData,
  onChangeRecibo,
  onClose,
  onConfirm,
}: ESocialMarcarEnviadoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar como enviado ao e-Social"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn btn-muted"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onConfirm()}
          >
            {saving ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-[#64748b]">
        Informe a data de envio e o Nº Recibo do e-Social.
      </p>
      <div className="flex flex-col gap-3">
        <Field label="Data envio e-Social">
          <input
            className="field-input"
            type="text"
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            value={dataEnvio}
            disabled={saving}
            onChange={(e) => onChangeData(maskDateBR(e.target.value))}
          />
        </Field>
        <Field label="Nº Recibo">
          <input
            className="field-input font-mono text-sm tracking-tight"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex.: 1.1.0000000040734596239"
            maxLength={RECIBO_MASKED_LENGTH}
            value={recibo}
            disabled={saving}
            onChange={(e) => onChangeRecibo(maskEsocialRecibo(e.target.value))}
          />
        </Field>
      </div>
    </Modal>
  );
}
