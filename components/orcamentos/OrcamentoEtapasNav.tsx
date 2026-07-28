"use client";

import type { OrcamentoEtapaEstado, OrcamentoEtapaId } from "@/lib/orcamento-etapas";
import { ORCAMENTO_ETAPAS, resolveOrcamentoEtapaEstado } from "@/lib/orcamento-etapas";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";

interface OrcamentoEtapasNavProps {
  tab: OrcamentoEtapaId;
  aprovacao: OrcamentoAprovacaoRecord | null;
  orcamentoAprovado: boolean;
  disabled?: boolean;
  onChange: (tab: OrcamentoEtapaId) => void;
}

function estadoIcon(estado: OrcamentoEtapaEstado): string {
  if (estado === "concluida") return "✓";
  if (estado === "atual") return "→";
  if (estado === "bloqueada") return "🔒";
  return "○";
}

export function OrcamentoEtapasNav({
  tab,
  aprovacao,
  orcamentoAprovado,
  disabled,
  onChange,
}: OrcamentoEtapasNavProps) {
  return (
    <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
      {ORCAMENTO_ETAPAS.map((item) => {
        const estado = resolveOrcamentoEtapaEstado(
          item.id,
          aprovacao,
          orcamentoAprovado,
          tab
        );
        const bloqueada = estado === "bloqueada";
        const ativa = tab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            disabled={bloqueada || disabled}
            title={bloqueada ? "Etapa bloqueada" : item.label}
            onClick={() => {
              if (!bloqueada) onChange(item.id);
            }}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors sm:text-[11px] ${
              ativa
                ? "bg-white text-[#082b63]"
                : bloqueada
                  ? "cursor-not-allowed bg-white/5 text-white/35 opacity-60"
                  : "bg-white/10 text-white/85 hover:bg-white/20"
            }`}
          >
            <span className="mr-1 inline-block w-3 text-center">
              {estadoIcon(estado)}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
