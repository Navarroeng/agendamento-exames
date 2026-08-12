"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import {
  RISCOS_RELATORIO_PRINT_ROOT_ID,
  exportarRelatorioRiscosPdf,
  nomeArquivoPdfRelatorioRiscos,
} from "@/lib/riscos-relatorio-pdf";
import { RelatorioCapa } from "@/components/riscos-psicossociais/relatorio/RelatorioCapa";
import { RelatorioResumoExecutivo } from "@/components/riscos-psicossociais/relatorio/RelatorioResumoExecutivo";
import { RelatorioRadarChart } from "@/components/riscos-psicossociais/relatorio/RelatorioRadarChart";
import { RelatorioBarrasChart } from "@/components/riscos-psicossociais/relatorio/RelatorioBarrasChart";
import { RelatorioRanking } from "@/components/riscos-psicossociais/relatorio/RelatorioRanking";
import { RelatorioHeatmap } from "@/components/riscos-psicossociais/relatorio/RelatorioHeatmap";
import { RelatorioDimensoesCards } from "@/components/riscos-psicossociais/relatorio/RelatorioDimensoesCards";
import { RelatorioConclusoesExecutivas } from "@/components/riscos-psicossociais/relatorio/RelatorioConclusoesExecutivas";
import { relatorioTemNormalizacao } from "@/lib/riscos-relatorio-view";

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
  const [exporting, setExporting] = useState(false);

  if (!open || !relatorio) return null;

  const dimensoes = relatorio.resultado_json?.dimensoes ?? [];
  const normalizado = relatorioTemNormalizacao(dimensoes);
  const empresa =
    relatorio.empresa_nome ||
    relatorio.resultado_json?.capa?.empresaNome ||
    "Empresa";

  async function handleSalvarPdf() {
    setExporting(true);
    try {
      const nome = nomeArquivoPdfRelatorioRiscos(empresa, relatorio!.gerado_em);
      toast.message("Abrindo impressão…", {
        description: `Use “Salvar como PDF”. Nome sugerido: ${nome}`,
      });
      await exportarRelatorioRiscosPdf({
        empresaNome: empresa,
        geradoEm: relatorio!.gerado_em,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao exportar o PDF."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Relatório Executivo"
      subtitle="Avaliação dos Riscos Psicossociais · COPSOQ II-Br"
      size="xxl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 riscos-relatorio-print-hide">
          <p className="text-[11px] text-app-muted">
            Documento gerado a partir do snapshot persistido — sem recálculo.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-sm font-bold text-navy transition hover:border-brand-blue hover:bg-brand-blue-soft hover:text-brand-blue disabled:opacity-50"
              disabled={exporting}
              onClick={() => void handleSalvarPdf()}
            >
              <span aria-hidden className="text-base leading-none">
                ⬇
              </span>
              {exporting ? "Preparando…" : "Salvar em PDF"}
            </button>
            <button
              type="button"
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-bold text-white"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      }
    >
      <div
        id={RISCOS_RELATORIO_PRINT_ROOT_ID}
        className="max-h-[75vh] space-y-10 overflow-y-auto pr-1"
      >
        {!normalizado ? (
          <div className="riscos-relatorio-print-section rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            <p className="font-extrabold">
              Snapshot anterior à normalização de escalas
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Este relatório foi gerado antes da equivalência de amplitudes
              (escala comum 0–4). Médias e classificações exibidas são as do
              momento da geração. Para aplicar a metodologia atual, um
              administrador deve usar <strong>Regenerar</strong>.
            </p>
          </div>
        ) : null}

        <div className="riscos-relatorio-print-section">
          <RelatorioCapa relatorio={relatorio} logoUrl={logoUrl} />
        </div>
        <div className="riscos-relatorio-print-section">
          <RelatorioResumoExecutivo relatorio={relatorio} />
        </div>
        <div className="riscos-relatorio-print-chart riscos-relatorio-print-section">
          <RelatorioRadarChart dimensoes={dimensoes} />
        </div>
        <div className="riscos-relatorio-print-chart riscos-relatorio-print-section">
          <RelatorioBarrasChart dimensoes={dimensoes} />
        </div>
        <div className="riscos-relatorio-print-section">
          <RelatorioRanking dimensoes={dimensoes} />
        </div>
        <div className="riscos-relatorio-print-section">
          <RelatorioHeatmap dimensoes={dimensoes} />
        </div>
        <div className="riscos-relatorio-print-section">
          <RelatorioDimensoesCards dimensoes={dimensoes} />
        </div>
        <div className="riscos-relatorio-print-section">
          <RelatorioConclusoesExecutivas relatorio={relatorio} />
        </div>

        <div className="riscos-relatorio-print-footer hidden">
          Navarro Engenharia · Relatório de Riscos Psicossociais
          {relatorio.codigo_publico
            ? ` · ${relatorio.codigo_publico}`
            : ""}{" "}
          · Gerado em{" "}
          {relatorio.gerado_em
            ? new Date(relatorio.gerado_em).toLocaleString("pt-BR")
            : "—"}
          <br />
          Use a numeração de páginas do diálogo de impressão (Salvar como PDF).
        </div>
      </div>
    </Modal>
  );
}
