"use client";

import { useEffect, useRef, useState } from "react";
import { Field, RequiredMark } from "@/components/ui/Field";
import {
  formatDateIsoToBR,
  isValidDateBR,
  parseDateBRToIso,
} from "@/lib/agendamento-datetime";
import { periodoLabelCustosClinica } from "@/lib/custos-clinicas-conferencia";
import {
  COMPROVANTE_ALLOWED_EXTENSIONS,
  COMPROVANTE_TIPO_INVALIDO_MSG,
  ComprovanteValidationError,
} from "@/lib/fatura-comprovante";
import {
  CONFERENCIA_DATA_OBRIGATORIA_MSG,
  CONFERENCIA_FATURA_OBRIGATORIA_MSG,
  validateFaturaClinicaFile,
} from "@/lib/fatura-conferencia-clinica";
import { formatCurrency } from "@/lib/money";
import type { FaturaRecord } from "@/lib/types";

interface FaturaConferenciaModalProps {
  open: boolean;
  fatura: FaturaRecord | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (
    dataConferenciaIso: string,
    observacao: string | null,
    faturaFile: File | null
  ) => void;
  onVerFatura?: (faturaId: string) => void;
}

const ACCEPTED_TYPES = COMPROVANTE_ALLOWED_EXTENSIONS.map(
  (ext) => `.${ext}`
).join(",");

export function FaturaConferenciaModal({
  open,
  fatura,
  saving = false,
  onClose,
  onConfirm,
  onVerFatura,
}: FaturaConferenciaModalProps) {
  const [dataConferencia, setDataConferencia] = useState("");
  const [observacao, setObservacao] = useState("");
  const [faturaFile, setFaturaFile] = useState<File | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [faturaError, setFaturaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const temFaturaExistente = Boolean(fatura?.fatura_clinica_path?.trim());

  useEffect(() => {
    if (!open || !fatura) return;

    setDataConferencia(
      fatura.conferido_em
        ? formatDateIsoToBR(fatura.conferido_em)
        : formatDateIsoToBR(new Date().toISOString().split("T")[0])
    );
    setObservacao(fatura.observacao_conferencia ?? "");
    setFaturaFile(null);
    setDataError(null);
    setFaturaError(null);
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
    setFaturaFile(file);
    setFaturaError(null);

    if (!file) return;

    try {
      validateFaturaClinicaFile(file);
    } catch (err) {
      setFaturaError(
        err instanceof ComprovanteValidationError
          ? err.message
          : COMPROVANTE_TIPO_INVALIDO_MSG
      );
    }
  };

  const handleConfirm = () => {
    if (!dataConferencia.trim()) {
      setDataError(CONFERENCIA_DATA_OBRIGATORIA_MSG);
      return;
    }
    if (!isValidDateBR(dataConferencia)) return;

    const iso = parseDateBRToIso(dataConferencia);
    if (!iso) return;

    if (!temFaturaExistente && !faturaFile) {
      setFaturaError(CONFERENCIA_FATURA_OBRIGATORIA_MSG);
      return;
    }

    if (faturaFile) {
      try {
        validateFaturaClinicaFile(faturaFile);
      } catch (err) {
        setFaturaError(
          err instanceof ComprovanteValidationError
            ? err.message
            : COMPROVANTE_TIPO_INVALIDO_MSG
        );
        return;
      }
    }

    onConfirm(iso, observacao.trim() || null, faturaFile);
  };

  const dateInvalid =
    dataConferencia.trim() !== "" && !isValidDateBR(dataConferencia);

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
        aria-labelledby="conferencia-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#eef2ff] to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-blue-soft text-lg text-brand-blue">
              ✓
            </div>
            <div>
              <h3
                id="conferencia-modal-title"
                className="text-lg font-extrabold text-[#2d2a4a]"
              >
                Conferir custos da clínica
              </h3>
              <p className="mt-1 text-sm font-semibold text-navy">
                {fatura.referencia_nome}
              </p>
              <p className="text-xs text-[#64748b]">
                {periodoLabelCustosClinica(fatura)} ·{" "}
                {formatCurrency(Number(fatura.valor_total))}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Field
            label={
              <>
                Data da conferência <RequiredMark />
              </>
            }
          >
            <input
              type="text"
              className="field-input w-full"
              placeholder="DD/MM/AAAA"
              value={dataConferencia}
              onChange={(e) => {
                setDataConferencia(e.target.value);
                setDataError(null);
              }}
              disabled={saving}
            />
            {dateInvalid && (
              <p className="text-xs text-brand-red">
                Data inválida. Use o formato DD/MM/AAAA.
              </p>
            )}
            {dataError && (
              <p className="text-xs text-brand-red">{dataError}</p>
            )}
          </Field>

          <Field
            label={
              temFaturaExistente ? (
                "Fatura da clínica"
              ) : (
                <>
                  Fatura da clínica <RequiredMark />
                </>
              )
            }
          >
            {temFaturaExistente && (
              <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2">
                <span className="text-xs text-[#475569]">
                  Arquivo atual:{" "}
                  <span className="font-semibold text-navy">
                    {fatura.fatura_clinica_nome || "Fatura da clínica"}
                  </span>
                </span>
                {onVerFatura && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-blue hover:underline"
                    onClick={() => onVerFatura(fatura.id)}
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
              {temFaturaExistente
                ? " Envie um novo arquivo apenas se quiser substituir a fatura."
                : ""}
            </p>
            {faturaFile && (
              <p className="text-xs font-medium text-brand-green">
                Selecionado: {faturaFile.name}
              </p>
            )}
            {faturaError && (
              <p className="text-xs text-brand-red">{faturaError}</p>
            )}
          </Field>

          <Field label="Observação da conferência">
            <textarea
              className="field-input !h-[96px] w-full resize-none py-3"
              placeholder="Digite alguma observação sobre a conferência…"
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
              Boolean(faturaError) ||
              (dataConferencia.trim() !== "" && dateInvalid)
            }
          >
            {saving ? "Salvando..." : "Confirmar conferência"}
          </button>
        </div>
      </div>
    </div>
  );
}
