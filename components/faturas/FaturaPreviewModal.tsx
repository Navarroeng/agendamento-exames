"use client";

import { Modal } from "@/components/ui/Modal";
import { FaturaPreviewContent } from "./FaturaPreviewContent";
import type { FaturaPreviewState } from "@/lib/types";

interface FaturaPreviewModalProps {
  open: boolean;
  preview: FaturaPreviewState | null;
  saving: boolean;
  onClose: () => void;
  onSaveDraft: () => void | Promise<void>;
  onEmit: () => void | Promise<void>;
  onGeneratePdf: () => void | Promise<void>;
}

export function FaturaPreviewModal({
  open,
  preview,
  saving,
  onClose,
  onSaveDraft,
  onEmit,
  onGeneratePdf,
}: FaturaPreviewModalProps) {
  if (!open || !preview) return null;

  const readonly = preview.readonly;
  const cancelled = preview.status === "cancelada";

  const footer = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      <button
        type="button"
        className="btn btn-muted"
        disabled={saving}
        onClick={onClose}
      >
        {readonly ? "Fechar" : "Voltar / Editar filtros"}
      </button>

      {!readonly && !cancelled && (
        <>
          <button
            type="button"
            className="btn"
            disabled={saving}
            onClick={() => void onSaveDraft()}
          >
            {saving ? "Salvando..." : "Salvar como rascunho"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onEmit()}
          >
            {saving ? "Emitindo..." : "Emitir fatura"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onGeneratePdf()}
          >
            {saving ? "Gerando..." : "Gerar PDF"}
          </button>
        </>
      )}

      {readonly && preview.status === "rascunho" && (
        <>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onEmit()}
          >
            {saving ? "Emitindo..." : "Emitir fatura"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={() => void onGeneratePdf()}
          >
            {saving ? "Gerando..." : "Gerar PDF"}
          </button>
        </>
      )}

      {readonly && preview.status === "emitida" && (
        <button
          type="button"
          className="btn btn-primary"
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
          ? `Fatura ${preview.numero ?? ""}`.trim()
          : "Pré-visualização da fatura"
      }
      extraWide
      footer={footer}
    >
      <FaturaPreviewContent preview={preview} />
    </Modal>
  );
}
