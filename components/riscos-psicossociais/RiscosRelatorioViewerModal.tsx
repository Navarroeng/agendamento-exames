"use client";

import { Modal } from "@/components/ui/Modal";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { RelatorioCapa } from "@/components/riscos-psicossociais/relatorio/RelatorioCapa";
import { RelatorioResumoExecutivo } from "@/components/riscos-psicossociais/relatorio/RelatorioResumoExecutivo";
import { RelatorioRadarChart } from "@/components/riscos-psicossociais/relatorio/RelatorioRadarChart";
import { RelatorioBarrasChart } from "@/components/riscos-psicossociais/relatorio/RelatorioBarrasChart";
import { RelatorioRanking } from "@/components/riscos-psicossociais/relatorio/RelatorioRanking";
import { RelatorioHeatmap } from "@/components/riscos-psicossociais/relatorio/RelatorioHeatmap";
import { RelatorioDimensoesCards } from "@/components/riscos-psicossociais/relatorio/RelatorioDimensoesCards";
import { RelatorioConclusoesExecutivas } from "@/components/riscos-psicossociais/relatorio/RelatorioConclusoesExecutivas";

interface RiscosRelatorioViewerModalProps {
  open: boolean;
  relatorio: RiscosRelatorioRecord | null;
  onClose: () => void;
  /** Logo da empresa quando disponível (apenas visual). */
  logoUrl?: string | null;
}

export function RiscosRelatorioViewerModal({
  open,
  relatorio,
  onClose,
  logoUrl,
}: RiscosRelatorioViewerModalProps) {
  if (!open || !relatorio) return null;

  const dimensoes = relatorio.resultado_json?.dimensoes ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Relatório Executivo"
      subtitle="Avaliação dos Riscos Psicossociais · COPSOQ II-Br"
      size="xxl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-app-muted">
            Documento gerado a partir do snapshot persistido — sem recálculo.
          </p>
          <button
            type="button"
            className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="max-h-[75vh] space-y-10 overflow-y-auto pr-1">
        <RelatorioCapa relatorio={relatorio} logoUrl={logoUrl} />
        <RelatorioResumoExecutivo relatorio={relatorio} />
        <RelatorioRadarChart dimensoes={dimensoes} />
        <RelatorioBarrasChart dimensoes={dimensoes} />
        <RelatorioRanking dimensoes={dimensoes} />
        <RelatorioHeatmap dimensoes={dimensoes} />
        <RelatorioDimensoesCards dimensoes={dimensoes} />
        <RelatorioConclusoesExecutivas relatorio={relatorio} />
      </div>
    </Modal>
  );
}
