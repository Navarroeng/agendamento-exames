"use client";

interface ClienteEncerrarContratoModalProps {
  open: boolean;
  saving: boolean;
  vigenciaLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ClienteEncerrarContratoModal({
  open,
  saving,
  vigenciaLabel,
  onClose,
  onConfirm,
}: ClienteEncerrarContratoModalProps) {
  if (!open) return null;

  const handleClose = () => {
    if (saving) return;
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
        className="animate-modal-in relative w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-[0_24px_48px_rgba(45,35,95,0.25)]"
        role="dialog"
        aria-modal="true"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#fffbeb] to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#fef3c7] text-lg text-[#b45309]">
              ⏹
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#2d2a4a]">
                Encerrar contrato
              </h3>
              <p className="mt-1 text-sm text-[#8b95a8]">
                O contrato <strong>{vigenciaLabel}</strong> será marcado como
                encerrado. O histórico será mantido para consulta futura.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e8edf5] px-6 py-4">
          <button
            type="button"
            className="btn"
            onClick={handleClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn bg-brand-red text-white hover:opacity-90"
            onClick={() => void onConfirm()}
            disabled={saving}
          >
            {saving ? "Encerrando..." : "Confirmar encerramento"}
          </button>
        </div>
      </div>
    </div>
  );
}
