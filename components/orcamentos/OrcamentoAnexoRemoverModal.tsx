"use client";

interface OrcamentoAnexoRemoverModalProps {
  open: boolean;
  titulo: string;
  mensagem: string;
  saving?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function OrcamentoAnexoRemoverModal({
  open,
  titulo,
  mensagem,
  saving = false,
  onClose,
  onConfirm,
}: OrcamentoAnexoRemoverModalProps) {
  if (!open) return null;

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
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
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fff7ed] to-white px-6 py-5">
          <h3 className="text-lg font-extrabold text-[#2d2a4a]">{titulo}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">{mensagem}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#e8edf5] px-6 py-4">
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={saving}
          >
            Voltar
          </button>
          <button
            type="button"
            className="btn border border-brand-red bg-white text-brand-red hover:bg-[#fef2f2]"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Removendo..." : "Confirmar remoção"}
          </button>
        </div>
      </div>
    </div>
  );
}
