import { toast } from "sonner";
import { PURPLE } from "./ViewModalUi";

interface ViewModalFooterProps {
  onClose: () => void;
}

export function ViewModalFooter({ onClose }: ViewModalFooterProps) {
  const handlePrint = () => {
    toast.info("Exportação em PDF em breve.");
  };

  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e8edf5] bg-white px-6 py-4 sm:px-8">
      <button
        type="button"
        onClick={handlePrint}
        className="inline-flex items-center gap-2 rounded-xl border border-[#dce3ef] bg-white px-5 py-2.5 text-sm font-bold text-[#52617a] shadow-sm transition hover:border-[#c5cde0] hover:bg-[#f8f9fc]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Imprimir
      </button>
      <button
        type="button"
        onClick={onClose}
        className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(91,74,203,0.35)] transition hover:opacity-95"
        style={{ background: PURPLE }}
      >
        <span>✕</span>
        Fechar
      </button>
    </footer>
  );
}
