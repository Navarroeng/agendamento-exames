"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import type { AgendamentoMesmoMesInfo } from "@/services/duplicidade.service";

interface AgendamentoDuplicidadeMesModalProps {
  open: boolean;
  agendamento: AgendamentoMesmoMesInfo | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function statusLabel(status: string): string {
  if (status === "agendado") return "Agendado";
  if (status === "rascunho") return "Rascunho";
  if (status === "cancelado") return "Cancelado";
  return status;
}

export function AgendamentoDuplicidadeMesModal({
  open,
  agendamento,
  saving = false,
  onClose,
  onConfirm,
}: AgendamentoDuplicidadeMesModalProps) {
  if (!open || !agendamento) return null;

  const handleClose = () => {
    if (saving) return;
    onClose();
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
        className="animate-modal-in relative w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-mes-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fffbeb] to-white px-6 py-5">
          <h3
            id="dup-mes-modal-title"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Colaborador já possui agendamento neste mês
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            Este colaborador já possui um agendamento registrado para esta
            empresa no mesmo mês. Revise antes de continuar.
          </p>
        </div>

        <div className="space-y-2 px-6 py-5 text-sm">
          {[
            ["Cliente", agendamento.cliente_nome],
            ["Colaborador", agendamento.colaborador],
            [
              "Data do agendamento existente",
              formatDateIsoToBR(agendamento.data_agendamento),
            ],
            ["Clínica", agendamento.clinica_nome],
            ["Tipo de ASO", agendamento.tipo_aso],
            ["Status", statusLabel(agendamento.status)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[140px_1fr] gap-3 border-b border-[#f1f5f9] py-2 last:border-0"
            >
              <span className="text-xs font-bold uppercase text-[#94a3b8]">
                {label}
              </span>
              <span className="font-semibold text-navy">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#e8edf5] bg-[#f8fafc] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={saving}
          >
            Voltar e revisar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={saving}
          >
            Salvar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}
