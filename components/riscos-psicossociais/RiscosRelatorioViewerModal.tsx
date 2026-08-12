"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import {
  exportarRelatorioRiscosPdf,
  nomeArquivoPdfRelatorioRiscos,
} from "@/lib/riscos-relatorio-pdf";
import { RelatorioDocumentoShell } from "@/components/riscos-psicossociais/relatorio/RelatorioDocumentoShell";
import { RelatorioDocumento } from "@/components/riscos-psicossociais/relatorio/RelatorioDocumento";

interface RiscosRelatorioViewerModalProps {
  open: boolean;
  relatorio: RiscosRelatorioRecord | null;
  onClose: () => void;
  /** Logo da empresa quando disponível (apenas visual). */
  logoUrl?: string | null;
  /** CNPJ da empresa avaliada (campanha) — só capa. */
  empresaCnpj?: string | null;
  /** Status da campanha — só capa. */
  campanhaStatus?: string | null;
}

/**
 * Visualizador do Relatório Executivo.
 * O documento oficial vive na folha A4 (`RelatorioDocumento`); o PDF imprime o mesmo DOM.
 */
export function RiscosRelatorioViewerModal({
  open,
  relatorio,
  onClose,
  logoUrl,
  empresaCnpj,
  campanhaStatus,
}: RiscosRelatorioViewerModalProps) {
  const [exporting, setExporting] = useState(false);

  if (!open || !relatorio) return null;

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
      subtitle="Documento A4 · visualização idêntica à exportação PDF"
      size="xxl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 riscos-relatorio-print-hide">
          <p className="text-[11px] text-app-muted">
            Folha A4 única — modal e PDF usam o mesmo documento.
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
      <RelatorioDocumentoShell>
        <RelatorioDocumento
          relatorio={relatorio}
          logoUrl={logoUrl}
          empresaCnpj={empresaCnpj}
          campanhaStatus={campanhaStatus}
        />
      </RelatorioDocumentoShell>
    </Modal>
  );
}
