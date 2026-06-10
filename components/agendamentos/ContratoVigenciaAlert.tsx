import { formatDateBR } from "@/lib/format";
import type { ContratoVigenciaCheckState } from "@/hooks/useContratoVigenciaCheck";

interface ContratoVigenciaAlertProps {
  state: ContratoVigenciaCheckState;
}

export function ContratoVigenciaAlert({ state }: ContratoVigenciaAlertProps) {
  if (state.status === "idle" || state.status === "loading") {
    return null;
  }

  if (state.status === "valid") {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm font-semibold text-[#15803d]">
        <span
          className="inline-flex rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#15803d]"
          aria-hidden
        >
          Vigente
        </span>
        Contrato vigente até {formatDateBR(state.dataFim)}
      </div>
    );
  }

  return (
    <div
      className="mt-3 rounded-xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm font-semibold leading-relaxed text-[#b91c1c]"
      role="alert"
    >
      {state.message}
    </div>
  );
}
