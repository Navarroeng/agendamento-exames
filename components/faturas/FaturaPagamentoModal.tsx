"use client";

import { useEffect, useRef, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import {
  formatDateIsoToBR,
  isValidDateBR,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import {
  COMPROVANTE_ALLOWED_EXTENSIONS,
  COMPROVANTE_OBRIGATORIO_MSG,
  COMPROVANTE_TIPO_INVALIDO_MSG,
  ComprovanteValidationError,
  validateComprovanteFile,
} from "@/lib/fatura-comprovante";
import type { FaturaRecord } from "@/lib/types";

export type FaturaPagamentoModalMode = "registrar" | "editar";

interface FaturaPagamentoModalProps {
  open: boolean;
  mode: FaturaPagamentoModalMode;
  fatura: FaturaRecord | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (
    dataPagamentoIso: string,
    observacao: string | null,
    comprovanteFile: File | null
  ) => void;
  onVerComprovante?: (faturaId: string) => void;
}

const ACCEPTED_TYPES = COMPROVANTE_ALLOWED_EXTENSIONS.map(
  (ext) => `.${ext}`
).join(",");

export function FaturaPagamentoModal({
  open,
  mode,
  fatura,
  saving = false,
  onClose,
  onConfirm,
  onVerComprovante,
}: FaturaPagamentoModalProps) {
  const [dataPagamento, setDataPagamento] = useState("");
  const [observacao, setObservacao] = useState("");
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null);
  const [comprovanteError, setComprovanteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const temComprovanteExistente = Boolean(
    fatura?.comprovante_pagamento_path?.trim()
  );

  useEffect(() => {
    if (!open || !fatura) return;

    setDataPagamento(
      fatura.data_pagamento
        ? formatDateIsoToBR(fatura.data_pagamento)
        : formatDateIsoToBR(new Date().toISOString().split("T")[0])
    );
    setObservacao(fatura.observacao_pagamento ?? "");
    setComprovanteFile(null);
    setComprovanteError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [open, fatura]);

  if (!open || !fatura) return null;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const handleFileChange = (file: File | null) => {
    setComprovanteFile(file);
    setComprovanteError(null);

    if (!file) return;

    try {
      validateComprovanteFile(file);
    } catch (err) {
      setComprovanteError(
        err instanceof ComprovanteValidationError
          ? err.message
          : COMPROVANTE_TIPO_INVALIDO_MSG
      );
    }
  };

  const handleConfirm = () => {
    if (!dataPagamento.trim()) return;
    if (!isValidDateBR(dataPagamento)) return;

    const iso = parseDateBRToIso(dataPagamento);
    if (!iso) return;

    const precisaComprovante =
      mode === "registrar" || !temComprovanteExistente;

    if (precisaComprovante && !comprovanteFile) {
      setComprovanteError(COMPROVANTE_OBRIGATORIO_MSG);
      return;
    }

    if (comprovanteFile) {
      try {
        validateComprovanteFile(comprovanteFile);
      } catch (err) {
        setComprovanteError(
          err instanceof ComprovanteValidationError
            ? err.message
            : COMPROVANTE_TIPO_INVALIDO_MSG
        );
        return;
      }
    }

    onConfirm(iso, observacao.trim() || null, comprovanteFile);
  };

  const title = mode === "registrar" ? "Registrar pagamento" : "Editar pagamento";
  const confirmLabel =
    mode === "registrar" ? "Confirmar pagamento" : "Salvar alterações";
  const dateInvalid =
    dataPagamento.trim() !== "" && !isValidDateBR(dataPagamento);

  const comprovanteLabel =
    mode === "registrar" || !temComprovanteExistente ? (
      <>
        Comprovante de pagamento <RequiredMark />
      </>
    ) : (
      "Comprovante de pagamento"
    );

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

          <Field label={comprovanteLabel}>
            {temComprovanteExistente && (
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                <span className="text-xs text-[#475569]">
                  Arquivo atual:{" "}
                  <span className="font-semibold text-navy">
                    {fatura.comprovante_pagamento_nome || "Comprovante"}
                  </span>
                </span>
                {onVerComprovante && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-blue hover:underline"
                    onClick={() => onVerComprovante(fatura.id)}
                    disabled={saving}
                  >
                    Visualizar
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              className="field-input w-full cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-brand-blue-soft file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-blue"
              disabled={saving}
              onChange={(e) =>
                handleFileChange(e.target.files?.[0] ?? null)
              }
            />
            <p className="text-[11px] text-[#94a3b8]">
              PDF, JPG, JPEG ou PNG — até 5 MB.
              {mode === "editar" && temComprovanteExistente
                ? " Envie um novo arquivo apenas se quiser substituir o comprovante."
                : ""}
            </p>
            {comprovanteFile && (
              <p className="text-xs font-medium text-brand-green">
                Selecionado: {comprovanteFile.name}
              </p>
            )}
            {comprovanteError && (
              <p className="text-xs text-brand-red">{comprovanteError}</p>
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
              !isValidDateBR(dataPagamento) ||
              Boolean(comprovanteError)
            }
          >
            {saving ? "Salvando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
