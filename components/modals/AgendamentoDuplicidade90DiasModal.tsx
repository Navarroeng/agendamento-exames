"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  AGENDAMENTO_DUPLICIDADE_90_DIAS_COMPLEMENTO,
  AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG,
} from "@/lib/agendamento-duplicidade-90dias";
import { formatCPF } from "@/lib/cpf";
import type { AgendamentoDuplicidade90DiasInfo } from "@/services/duplicidade.service";

interface AgendamentoDuplicidade90DiasModalProps {
  open: boolean;
  agendamento: AgendamentoDuplicidade90DiasInfo | null;
  onClose: () => void;
}

function statusLabel(status: string): string {
  if (status === "agendado") return "Agendado";
  if (status === "aso_retido") return "ASO Retido";
  if (status === "rascunho") return "Rascunho";
  if (status === "cancelado") return "Cancelado";
  return status;
}

export function AgendamentoDuplicidade90DiasModal({
  open,
  agendamento,
  onClose,
}: AgendamentoDuplicidade90DiasModalProps) {
  if (!open || !agendamento) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-90d-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fef2f2] to-white px-6 py-5">
          <h3
            id="dup-90d-modal-title"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Agendamento bloqueado
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            {AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            {AGENDAMENTO_DUPLICIDADE_90_DIAS_COMPLEMENTO}
          </p>
        </div>

        <div className="space-y-2 px-6 py-5 text-sm">
          {[
            ["Empresa", agendamento.cliente_nome],
            ["Colaborador", agendamento.colaborador],
            ["CPF", formatCPF(agendamento.colaborador_cpf)],
            [
              "Data do agendamento existente",
              formatDateIsoToBR(agendamento.data_agendamento),
            ],
            ["Tipo de ASO existente", agendamento.tipo_aso],
            ["Clínica existente", agendamento.clinica_nome],
            ["Status existente", statusLabel(agendamento.status)],
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

        <div className="flex justify-end border-t border-[#e8edf5] bg-[#f8fafc] px-6 py-4">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
