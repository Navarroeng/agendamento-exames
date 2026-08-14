"use client";

import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { maskDateBR } from "@/lib/agendamento-datetime";
import {
  ESOCIAL_RECIBO_DUPLICADO_COMPLEMENTO,
  formatEsocialReciboDuplicadoDetalhes,
  type EsocialReciboDuplicadoInfo,
} from "@/lib/esocial-recibo-duplicidade";
import {
  RECIBO_MASKED_LENGTH,
  maskEsocialRecibo,
} from "@/lib/esocial-recibo";

interface ESocialMarcarEnviadoModalProps {
  open: boolean;
  saving: boolean;
  validatingRecibo: boolean;
  dataEnvio: string;
  numeroMatricula: string;
  recibo: string;
  reciboError: string | null;
  reciboDuplicadoInfo: EsocialReciboDuplicadoInfo | null;
  onChangeData: (value: string) => void;
  onChangeMatricula: (value: string) => void;
  onChangeRecibo: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function ESocialMarcarEnviadoModal({
  open,
  saving,
  validatingRecibo,
  dataEnvio,
  numeroMatricula,
  recibo,
  reciboError,
  reciboDuplicadoInfo,
  onChangeData,
  onChangeMatricula,
  onChangeRecibo,
  onClose,
  onConfirm,
}: ESocialMarcarEnviadoModalProps) {
  const confirmDisabled = saving || validatingRecibo;
  const reciboHasError = Boolean(reciboError);

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
            disabled={confirmDisabled}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={confirmDisabled}
            onClick={() => void onConfirm()}
          >
            {saving
              ? "Salvando..."
              : validatingRecibo
                ? "Validando..."
                : "Confirmar"}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-[#64748b]">
        Informe os dados do envio ao e-Social.
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
            disabled={confirmDisabled}
            onChange={(e) => onChangeData(maskDateBR(e.target.value))}
          />
        </Field>
        <Field label="Nº Recibo">
          <input
            className={`field-input font-mono text-sm tracking-tight ${
              reciboHasError
                ? "border-brand-red ring-1 ring-brand-red/30 focus:border-brand-red"
                : ""
            }`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex.: 1.1.0000000040734596239"
            maxLength={RECIBO_MASKED_LENGTH}
            value={recibo}
            disabled={confirmDisabled}
            onChange={(e) => onChangeRecibo(maskEsocialRecibo(e.target.value))}
            aria-invalid={reciboHasError}
          />
          {reciboHasError && (
            <div className="mt-2 space-y-2">
              <p className="text-sm font-medium text-brand-red">{reciboError}</p>
              {reciboDuplicadoInfo && (
                <div className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-xs text-[#7f1d1d]">
                  {formatEsocialReciboDuplicadoDetalhes(reciboDuplicadoInfo).map(
                    (line) => (
                      <p key={line}>{line}</p>
                    )
                  )}
                </div>
              )}
              <p className="text-xs text-[#64748b]">
                {ESOCIAL_RECIBO_DUPLICADO_COMPLEMENTO}
              </p>
            </div>
          )}
        </Field>
        <Field label="Número da matrícula">
          <input
            className="field-input"
            type="text"
            autoComplete="off"
            placeholder="Digite a matrícula"
            value={numeroMatricula}
            disabled={confirmDisabled}
            onChange={(e) => onChangeMatricula(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
