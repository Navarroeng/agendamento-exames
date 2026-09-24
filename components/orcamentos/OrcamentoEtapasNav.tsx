"use client";

import type {
  OrcamentoEtapaEstado,
  OrcamentoEtapaId,
  OrcamentoEtapasContagemAgendamentos,
  OrcamentoEtapasContexto,
} from "@/lib/orcamento-etapas";
import {
  buildOrcamentoEtapas,
  resolveOrcamentoEtapaEstado,
} from "@/lib/orcamento-etapas";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoFluxoImplantacao } from "@/lib/servico-treinamentos";
import {
  copyLaudoPontual,
  fluxoToLaudoPontualKind,
} from "@/lib/servico-laudo-pontual";
import type { ImplantacaoTreinamentoRecord } from "@/lib/implantacao-treinamento";
import type { ImplantacaoAetRecord } from "@/lib/implantacao-aet";

interface OrcamentoEtapasNavProps {
  tab: OrcamentoEtapaId;
  aprovacao: OrcamentoAprovacaoRecord | null;
  orcamentoAprovado: boolean;
  disabled?: boolean;
  fluxo?: OrcamentoFluxoImplantacao;
  treinamento?: ImplantacaoTreinamentoRecord | null;
  aet?: ImplantacaoAetRecord | null;
  contagemAgendamentos?: OrcamentoEtapasContagemAgendamentos | null;
  onChange: (tab: OrcamentoEtapaId) => void;
}

function estadoIcon(estado: OrcamentoEtapaEstado): string {
  if (estado === "concluida") return "✓";
  if (estado === "atual") return "→";
  if (estado === "bloqueada") return "🔒";
  if (estado === "pendente") return "●";
  return "○";
}

export function OrcamentoEtapasNav({
  tab,
  aprovacao,
  orcamentoAprovado,
  disabled,
  fluxo = "padrao",
  treinamento = null,
  aet = null,
  contagemAgendamentos = null,
  onChange,
}: OrcamentoEtapasNavProps) {
  const etapas = buildOrcamentoEtapas(fluxo);
  const ctx: OrcamentoEtapasContexto = {
    fluxo,
    treinamento,
    aet,
    contagem: contagemAgendamentos,
  };
  const laudoKind = fluxoToLaudoPontualKind(fluxo);
  const envioBloqueadoTitle = laudoKind
    ? copyLaudoPontual(laudoKind).concluaAntesEnvio
    : "Etapa bloqueada";

  return (
    <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
      {etapas.map((item) => {
        const estado = resolveOrcamentoEtapaEstado(
          item.id,
          aprovacao,
          orcamentoAprovado,
          tab,
          contagemAgendamentos,
          ctx
        );
        const bloqueada = estado === "bloqueada";
        const ativa = tab === item.id;

        return (
          <button
            key={item.id}
            type="button"
            disabled={bloqueada || disabled}
            title={
              bloqueada
                ? item.id === "elaboracao"
                  ? "Aguardando realização da visita"
                  : item.id === "envio"
                    ? envioBloqueadoTitle
                    : "Etapa bloqueada"
                : estado === "pendente"
                  ? "Aguardando pagamento"
                  : item.label
            }
            onClick={() => {
              if (!bloqueada) onChange(item.id);
            }}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition-colors sm:text-[11px] ${
              ativa
                ? "bg-white text-[#082b63]"
                : bloqueada
                  ? "cursor-not-allowed bg-white/5 text-white/35 opacity-60"
                  : estado === "pendente"
                    ? "bg-[#f59e0b]/25 text-[#fde68a] hover:bg-[#f59e0b]/40"
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
