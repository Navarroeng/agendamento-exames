"use client";

import { useEffect, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import {
  formatDateIsoToBR,
  isValidDateBR,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import type { FaturaRecord } from "@/lib/types";

export type FaturaPagamentoModalMode = "registrar" | "editar";

interface FaturaPagamentoModalProps {
  open: boolean;
  mode: FaturaPagamentoModalMode;
  fatura: FaturaRecord | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (dataPagamentoIso: string, observacao: string | null) => void;
}

export function FaturaPagamentoModal({
  open,
  mode,
  fatura,
  saving = false,
  onClose,
  onConfirm,
}: FaturaPagamentoModalProps) {
  const [dataPagamento, setDataPagamento] = useState("");
  const [observacao, setObservacao] = useState("");

  useEffect(() => {
    if (!open || !fatura) return;

    setDataPagamento(
      fatura.data_pagamento
        ? formatDateIsoToBR(fatura.data_pagamento)
        : formatDateIsoToBR(new Date().toISOString().split("T")[0])
    );
    setObservacao(fatura.observacao_pagamento ?? "");
  }, [open, fatura]);

  if (!open || !fatura) return null;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleConfirm = () => {
    if (!dataPagamento.trim()) return;
    if (!isValidDateBR(dataPagamento)) return;

    const iso = parseDateBRToIso(dataPagamento);
    if (!iso) return;

    onConfirm(iso, observacao.trim() || null);
  };

  const title = mode === "registrar" ? "Registrar pagamento" : "Editar pagamento";
  const confirmLabel =
    mode === "registrar" ? "Confirmar pagamento" : "Salvar alterações";
  const dateInvalid =
    dataPagamento.trim() !== "" && !isValidDateBR(dataPagamento);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/50 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pagamento-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#e9f8ef] to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-green-soft text-lg text-brand-green">
              ✓
            </div>
            <div>
              <h3
                id="pagamento-modal-title"
                className="text-lg font-extrabold text-[#2d2a4a]"
              >
                {title}
              </h3>
              <p className="mt-1 text-sm text-[#8b95a8]">
                Fatura {fatura.numero} · {fatura.referencia_nome}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Field
            label={
              <>
                Data do pagamento <RequiredMark />
              </>
            }
          >
            <input
              type="text"
              className="field-input w-full"
              placeholder="DD/MM/AAAA"
              value={dataPagamento}
              onChange={(e) => setDataPagamento(e.target.value)}
              disabled={saving}
            />
            {dateInvalid && (
              <p className="text-xs text-brand-red">
                Data inválida. Use o formato DD/MM/AAAA.
              </p>
            )}
          </Field>

          <Field label="Observação">
            <textarea
              className="field-input !h-[96px] w-full resize-none py-3"
              placeholder="Observação opcional sobre o pagamento..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              disabled={saving}
            />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#e8edf5] bg-[#f8f9fc] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn justify-center sm:w-auto"
            onClick={handleClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary justify-center sm:w-auto"
            onClick={handleConfirm}
            disabled={
              saving ||
              !dataPagamento.trim() ||
              !isValidDateBR(dataPagamento)
            }
          >
            {saving ? "Salvando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
