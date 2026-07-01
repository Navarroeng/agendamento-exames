"use client";

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { formatCurrency } from "@/lib/money";
import { faturaClinicaHistoricoStatusLabel } from "@/lib/custos-clinicas-conferencia";
import type { FaturaExistenteInfo } from "@/services/duplicidade.service";

interface FaturaDuplicidadeModalProps {
  open: boolean;
  fatura: FaturaExistenteInfo | null;
  tipo: "cliente" | "clinica";
  onClose: () => void;
}

function statusLabel(status: string, tipo: "cliente" | "clinica"): string {
  if (tipo === "clinica") {
    return faturaClinicaHistoricoStatusLabel(
      status as "rascunho" | "emitida" | "cancelada",
      false
    );
  }
  if (status === "emitida") return "Emitida";
  if (status === "rascunho") return "Rascunho";
  if (status === "cancelada") return "Cancelada";
  return status;
}

export function FaturaDuplicidadeModal({
  open,
  fatura,
  tipo,
  onClose,
}: FaturaDuplicidadeModalProps) {
  if (!open || !fatura) return null;

  const titulo =
    tipo === "cliente"
      ? "Fatura do cliente já existe neste mês"
      : "Custos da clínica já existem neste mês";

  const mensagem =
    tipo === "cliente"
      ? "Já existe uma fatura emitida ou em rascunho para este cliente neste mês de referência."
      : "Já existem custos conferidos ou abertos para conferência desta clínica neste mês de referência.";

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
        aria-labelledby="fatura-dup-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fef2f2] to-white px-6 py-5">
          <h3
            id="fatura-dup-modal-title"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            {titulo}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            {mensagem}
          </p>
        </div>

        <div className="space-y-2 px-6 py-5 text-sm">
          {[
            ["Número", fatura.numero],
            ["Status", statusLabel(fatura.status, tipo)],
            [
              "Data de emissão",
              fatura.data_emissao
                ? formatDateIsoToBR(fatura.data_emissao.split("T")[0])
                : "—",
            ],
            ["Valor total", formatCurrency(fatura.valor_total)],
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
