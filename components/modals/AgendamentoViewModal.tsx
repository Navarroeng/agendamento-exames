"use client";

import type { AgendamentoFaturaBloqueio } from "@/lib/agendamento-fatura-bloqueio";
import type { AgendamentoWithExames } from "@/lib/types";
import { ViewModalAsoRetidoSection } from "./agendamento-view/ViewModalAsoRetidoSection";
import { ViewModalDocumentationSection } from "./agendamento-view/ViewModalDocumentationSection";
import { ViewModalExamsSection } from "./agendamento-view/ViewModalExamsSection";
import { ViewModalFooter } from "./agendamento-view/ViewModalFooter";
import { ViewModalGeneralSection } from "./agendamento-view/ViewModalGeneralSection";
import { ViewModalHeader } from "./agendamento-view/ViewModalHeader";

interface AgendamentoViewModalProps {
  agendamento: AgendamentoWithExames | null;
  faturaBloqueio?: AgendamentoFaturaBloqueio | null;
  onClose: () => void;
  onEdit?: (agendamentoId: string) => void;
}

export function AgendamentoViewModal({
  agendamento,
  faturaBloqueio,
  onClose,
}: AgendamentoViewModalProps) {
  if (!agendamento) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/55 backdrop-blur-md"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative flex max-h-[96vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_40px_80px_-20px_rgba(45,35,95,0.35)] sm:rounded-[24px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-modal-title"
      >
        <ViewModalHeader agendamento={agendamento} onClose={onClose} />

        <div className="flex-1 overflow-y-auto bg-[#f8f9fc] px-6 py-6 sm:px-8">
          <div className="space-y-8">
            {faturaBloqueio?.bloqueado &&
              faturaBloqueio.faturaNumero &&
              faturaBloqueio.faturaStatusLabel && (
                <div className="rounded-2xl border border-[#fde68a] bg-gradient-to-br from-[#fffbeb] to-white p-5 shadow-[0_6px_20px_rgba(180,83,9,0.08)]">
                  <p className="text-sm leading-relaxed text-[#92400e]">
                    Agendamento bloqueado para edição. Fatura vinculada:{" "}
                    <strong className="font-semibold text-[#78350f]">
                      {faturaBloqueio.faturaNumero}
                    </strong>{" "}
                    — Status:{" "}
                    <strong className="font-semibold text-[#78350f]">
                      {faturaBloqueio.faturaStatusLabel}
                    </strong>
                    .
                  </p>
                </div>
              )}

            {agendamento.status === "cancelado" &&
              agendamento.motivo_cancelamento && (
                <div className="rounded-2xl border border-[#fecaca] bg-gradient-to-br from-[#fef2f2] to-white p-5 shadow-[0_6px_20px_rgba(220,38,38,0.08)]">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fef2f2] text-sm font-bold text-[#dc2626]">
                      ✕
                    </span>
                    <h4 className="text-[15px] font-extrabold text-[#dc2626]">
                      Motivo do cancelamento
                    </h4>
                  </div>
                  <p className="text-sm leading-relaxed text-[#1f2937]">
                    {agendamento.motivo_cancelamento}
                  </p>
                </div>
              )}

            <ViewModalGeneralSection agendamento={agendamento} />
            <ViewModalExamsSection agendamento={agendamento} />
            <ViewModalAsoRetidoSection agendamento={agendamento} />
            <ViewModalDocumentationSection agendamento={agendamento} />
          </div>
        </div>

        <ViewModalFooter onClose={onClose} />
      </div>
    </div>
  );
}
