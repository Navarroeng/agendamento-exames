"use client";

import { Modal } from "@/components/ui/Modal";
import { formatDateBR } from "@/lib/format";
import type { PeriodicoFuturoRecord } from "@/lib/types";

interface PeriodicoFuturoVinculoModalProps {
  open: boolean;
  periodico: PeriodicoFuturoRecord | null;
  saving?: boolean;
  onCancelar: () => void;
  onContinuar: () => void;
  onUtilizar: () => void;
}

export function PeriodicoFuturoVinculoModal({
  open,
  periodico,
  saving = false,
  onCancelar,
  onContinuar,
  onUtilizar,
}: PeriodicoFuturoVinculoModalProps) {
  const dataLabel = periodico?.proxima_data
    ? formatDateBR(periodico.proxima_data)
    : "—";

  return (
    <Modal
      open={open}
      onClose={onCancelar}
      title="Periódico futuro pendente"
      closeOnOverlayClick={!saving}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={onCancelar}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-muted justify-center sm:w-auto"
            onClick={onContinuar}
            disabled={saving}
          >
            Continuar mesmo assim
          </button>
          <button
            type="button"
            className="btn btn-primary justify-center sm:w-auto"
            onClick={onUtilizar}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Utilizar este agendamento"}
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-[#334155]">
        <p className="font-semibold text-navy">
          Este colaborador possui um exame programado em Periódicos Futuros para
          a data {dataLabel}.
        </p>
        {periodico ? (
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-xs text-[#475569]">
            <p>
              <span className="font-bold text-navy">Colaborador:</span>{" "}
              {periodico.colaborador}
            </p>
            <p className="mt-1">
              <span className="font-bold text-navy">Exame / ASO:</span>{" "}
              {periodico.tipo_aso || periodico.exame_nome || "—"}
            </p>
            {periodico.motivo ? (
              <p className="mt-1">
                <span className="font-bold text-navy">Motivo:</span>{" "}
                {periodico.motivo}
                {periodico.motivo_detalhe
                  ? ` — ${periodico.motivo_detalhe}`
                  : ""}
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="text-[13px] leading-relaxed text-[#64748b]">
          Você pode continuar sem vincular, cancelar o salvamento ou utilizar
          este agendamento para atender o Periódico Futuro e evitar
          duplicidade.
        </p>
      </div>
    </Modal>
  );
}
