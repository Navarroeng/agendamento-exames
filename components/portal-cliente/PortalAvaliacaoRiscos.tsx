"use client";

import { PortalCampanhaDetalhe } from "@/components/portal-cliente/PortalCampanhaDetalhe";
import { PortalHistoricoAvaliacoes } from "@/components/portal-cliente/PortalHistoricoAvaliacoes";
import { isPortalUuid, type PortalResumo } from "@/lib/portal-cliente";

export function PortalAvaliacaoRiscos({
  resumo,
  clienteId,
  campanhaIdSelecionada,
  onVoltar,
  onAbrirCampanha,
  onVoltarLista,
}: {
  resumo: PortalResumo;
  clienteId: string;
  campanhaIdSelecionada: string | null;
  onVoltar: () => void;
  onAbrirCampanha: (campanhaId: string) => void;
  onVoltarLista: () => void;
}) {
  const campanhaValida =
    Boolean(campanhaIdSelecionada) &&
    isPortalUuid(campanhaIdSelecionada) &&
    resumo.campanhasLista.some(
      (c) => c.campanhaId === campanhaIdSelecionada
    );
  const detalhePronto =
    campanhaValida && resumo.campanhaId === campanhaIdSelecionada;

  if (detalhePronto) {
    return (
      <PortalCampanhaDetalhe
        resumo={resumo}
        clienteId={clienteId}
        onVoltarLista={onVoltarLista}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="w-fit text-sm font-semibold text-[#64748b] transition hover:text-[#0b1f4d]"
        onClick={onVoltar}
      >
        ← Voltar ao portal
      </button>
      <PortalHistoricoAvaliacoes
        empresaNome={resumo.empresaNome || "Empresa"}
        logoUrl={resumo.logoUrl}
        campanhas={resumo.campanhasLista}
        onAbrirCampanha={onAbrirCampanha}
      />
    </div>
  );
}
