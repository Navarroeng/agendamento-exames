"use client";

interface AgendamentoLiberarAsoRetidoModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving?: boolean;
}

export function AgendamentoLiberarAsoRetidoModal({
  open,
  onClose,
  onConfirm,
  saving = false,
}: AgendamentoLiberarAsoRetidoModalProps) {
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
        aria-labelledby="liberar-aso-retido-title"
      >
        <div className="border-b border-[#e8edf5] bg-gradient-to-br from-[#ecfdf3] to-white px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#ecfdf3] text-lg text-[#16a34a]">
              ✓
            </div>
            <div>
              <h3
                id="liberar-aso-retido-title"
                className="text-lg font-extrabold text-[#2d2a4a]"
              >
                Liberar ASO Retido
              </h3>
              <p className="mt-1 text-sm text-[#8b95a8]">
                O agendamento voltará para o status Agendado. O documento anexado
                e o histórico da retenção serão mantidos.
              </p>
            </div>
          </div>
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
            className="inline-flex items-center justify-center rounded-[14px] border border-transparent bg-[#16a34a] px-5 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.25)] transition hover:bg-[#15803d] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? "Liberando..." : "Confirmar liberação"}
          </button>
        </div>
      </div>
    </div>
  );
}
