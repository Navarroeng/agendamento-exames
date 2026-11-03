"use client";

import { Modal } from "@/components/ui/Modal";
import { FaturaPreviewContent } from "./FaturaPreviewContent";
import { CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO } from "@/lib/custos-clinicas-conferencia";
import { acoesRodapePreviewFatura } from "@/lib/fatura-preview-rodape";
import type { FaturaPreviewState } from "@/lib/types";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";

interface FaturaPreviewModalProps {
  open: boolean;
  preview: FaturaPreviewState | null;
  saving: boolean;
  onClose: () => void;
  onSaveDraft: () => void | Promise<void>;
  onEmit: () => void | Promise<void>;
  onGeneratePdf: () => void | Promise<void>;
  auditOptions?: { auditContext?: AuditoriaUsuarioContext };
  onFaturaAtualizada?: (preview: FaturaPreviewState) => void;
  onAbrirFaturaRelacionada?: (faturaId: string) => void;
  onVerFaturaClinica?: (faturaId: string) => void;
}

export function FaturaPreviewModal({
  open,
  preview,
  saving,
  onClose,
  onSaveDraft,
  onEmit,
  onGeneratePdf,
  auditOptions,
  onFaturaAtualizada,
  onAbrirFaturaRelacionada,
  onVerFaturaClinica,
}: FaturaPreviewModalProps) {
  if (!open || !preview) return null;

  const readonly = preview.readonly;
  const isClinica = preview.tipo === "clinica";
  const acoes = acoesRodapePreviewFatura(preview);
  const emitLabel = isClinica
    ? CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO
    : "Emitir fatura";
  const emittingLabel = isClinica ? "Conferindo..." : "Emitindo...";

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <button
        type="button"
        className="btn btn-muted w-full sm:w-auto"
        disabled={saving}
        onClick={onClose}
      >
        {acoes.rotuloFechar}
      </button>

      {acoes.mostrarSalvarRascunho && (
        <button
          type="button"
          className="btn w-full sm:w-auto"
          disabled={saving}
          onClick={() => void onSaveDraft()}
        >
          {saving ? "Salvando..." : "Salvar como rascunho"}
        </button>
      )}

      {acoes.mostrarEmitir && (
        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          disabled={saving}
          onClick={() => void onEmit()}
        >
          {saving ? emittingLabel : emitLabel}
        </button>
      )}

      {acoes.mostrarGerarPdf && (
        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          disabled={saving}
          onClick={() => void onGeneratePdf()}
        >
          {saving ? "Gerando..." : "Gerar PDF"}
        </button>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        readonly
          ? isClinica
            ? `Custos ${preview.numero ?? ""}`.trim()
            : `Fatura ${preview.numero ?? ""}`.trim()
          : isClinica
            ? "Pré-visualização dos custos"
            : "Pré-visualização da fatura"
      }
      extraWide
      footer={footer}
    >
      <FaturaPreviewContent
        preview={preview}
        saving={saving}
        showClinica={preview.tipo === "cliente"}
        auditOptions={auditOptions}
        onFaturaAtualizada={onFaturaAtualizada}
        onAbrirFaturaRelacionada={onAbrirFaturaRelacionada}
        onVerFaturaClinica={onVerFaturaClinica}
      />
    </Modal>
  );
}
