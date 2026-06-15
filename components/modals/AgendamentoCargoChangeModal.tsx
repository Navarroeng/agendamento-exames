"use client";

interface AgendamentoCargoChangeModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function AgendamentoCargoChangeModal({
  open,
  loading = false,
  onClose,
  onConfirm,
}: AgendamentoCargoChangeModalProps) {
  if (!open) return null;

  const handleClose = () => {
    if (loading) return;
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
        aria-labelledby="cargo-change-modal-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fffbeb] to-white px-6 py-5">
          <h3
            id="cargo-change-modal-title"
            className="text-lg font-extrabold text-[#2d2a4a]"
          >
            Alterar cargo
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[#64748b]">
            Ao alterar o cargo, os exames atuais serão substituídos pelos exames
            obrigatórios do novo cargo. Deseja continuar?
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#e8edf5] bg-[#f8fafc] px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
