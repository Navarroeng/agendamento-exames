"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RelatorioDocumento } from "@/components/riscos-psicossociais/relatorio/RelatorioDocumento";
import { RelatorioDocumentoShell } from "@/components/riscos-psicossociais/relatorio/RelatorioDocumentoShell";
import { isPortalUuid } from "@/lib/portal-cliente";
import {
  exportarRelatorioRiscosPdf,
  nomeArquivoPdfRelatorioRiscos,
} from "@/lib/riscos-relatorio-pdf";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { resolverUrlLogoCampanhaOuEmpresa } from "@/services/riscos-campanha-logo.service";
import { buscarCampanhaPorId } from "@/services/riscos-campanha.service";
import { buscarRelatorioCampanha } from "@/services/riscos-relatorio.service";

export function PortalRelatorioPrintView({
  campanhaId,
}: {
  campanhaId: string;
}) {
  const [relatorio, setRelatorio] = useState<RiscosRelatorioRecord | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [empresaCnpj, setEmpresaCnpj] = useState<string | null>(null);
  const [campanhaStatus, setCampanhaStatus] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setCarregando(true);
      setErro(null);
      setRelatorio(null);
      if (!isPortalUuid(campanhaId)) {
        setErro("Campanha inválida.");
        setCarregando(false);
        return;
      }
      try {
        const [row, campanha] = await Promise.all([
          buscarRelatorioCampanha(campanhaId),
          buscarCampanhaPorId(campanhaId),
        ]);
        if (cancel) return;
        if (!row) {
          setErro("Relatório ainda não disponível.");
          return;
        }
        if (row.campanha_id !== campanhaId) {
          setErro("O relatório retornado não corresponde a este ciclo.");
          return;
        }
        setRelatorio(row);
        setEmpresaCnpj(campanha?.cnpj ?? null);
        setCampanhaStatus(campanha?.status ?? null);
        if (campanha) {
          const logo = await resolverUrlLogoCampanhaOuEmpresa(campanha);
          if (!cancel) setLogoUrl(logo);
        }
      } catch (err) {
        if (!cancel) {
          setErro(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o relatório."
          );
        }
      } finally {
        if (!cancel) setCarregando(false);
      }
    }
    void load();
    return () => {
      cancel = true;
    };
  }, [campanhaId]);

  async function handleSalvarPdf() {
    if (!relatorio) return;
    setExportando(true);
    try {
      const empresa =
        relatorio.empresa_nome ||
        relatorio.resultado_json?.capa?.empresaNome ||
        "Empresa";
      toast.message("Abrindo impressão…", {
        description: `Use “Salvar como PDF”. Nome sugerido: ${nomeArquivoPdfRelatorioRiscos(
          empresa,
          relatorio.gerado_em
        )}`,
      });
      await exportarRelatorioRiscosPdf({
        empresaNome: empresa,
        geradoEm: relatorio.gerado_em,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao exportar o PDF."
      );
    } finally {
      setExportando(false);
    }
  }

  if (carregando) {
    return (
      <p className="py-20 text-center text-sm text-[#64748b]">
        Carregando relatório…
      </p>
    );
  }

  if (erro || !relatorio) {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <p className="text-sm text-[#64748b]">{erro ?? "Relatório não encontrado."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e5e9ef]">
      <div className="riscos-relatorio-print-hide sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#e2e8f0] bg-white px-4 py-3">
        <p className="text-sm font-semibold text-[#0b1f4d]">
          Relatório técnico · {relatorio.empresa_nome}
        </p>
        <button
          type="button"
          className="rounded-lg bg-[#0b1f4d] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={exportando}
          onClick={() => void handleSalvarPdf()}
        >
          {exportando ? "Preparando…" : "Salvar como PDF"}
        </button>
      </div>
      <RelatorioDocumentoShell>
        <RelatorioDocumento
          relatorio={relatorio}
          logoUrl={logoUrl}
          empresaCnpj={empresaCnpj}
          campanhaStatus={campanhaStatus}
        />
      </RelatorioDocumentoShell>
    </div>
  );
}
