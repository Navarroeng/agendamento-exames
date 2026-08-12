"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { AuditoriaUsuarioContext } from "@/lib/auditoria";
import {
  formatDataHoraRelatorio,
  formatTaxaParticipacao,
  validatePodeGerarRelatorioFinal,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import type { RiscosCampanhaParticipanteRecord } from "@/lib/riscos-campanha-participantes";
import type { RiscosCampanhaRecord } from "@/lib/riscos-campanha";
import {
  buscarRelatorioCampanha,
  gerarRelatorioCampanha,
  regenerarRelatorioCampanha,
} from "@/services/riscos-relatorio.service";
import { resolverUrlLogoCampanhaOuEmpresa } from "@/services/riscos-campanha-logo.service";
import { RiscosRelatorioViewerModal } from "@/components/riscos-psicossociais/RiscosRelatorioViewerModal";

interface RiscosRelatorioPanelProps {
  campanha: RiscosCampanhaRecord | null;
  participantes: RiscosCampanhaParticipanteRecord[];
  isAdmin?: boolean;
  auditContext?: AuditoriaUsuarioContext;
  onRelatorioChange?: (relatorio: RiscosRelatorioRecord | null) => void;
}

export function RiscosRelatorioPanel({
  campanha,
  participantes,
  isAdmin = false,
  auditContext,
  onRelatorioChange,
}: RiscosRelatorioPanelProps) {
  const [relatorio, setRelatorio] = useState<RiscosRelatorioRecord | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const onRelatorioChangeRef = useRef(onRelatorioChange);
  onRelatorioChangeRef.current = onRelatorioChange;

  const ativos = useMemo(
    () =>
      participantes.filter(
        (p) => p.status !== "removido" && p.status !== "invalidado"
      ),
    [participantes]
  );

  const motivoBloqueio = useMemo(
    () =>
      validatePodeGerarRelatorioFinal({
        campanhaStatus: campanha?.status,
        participantesAtivos: ativos,
        jaExisteRelatorio: Boolean(relatorio),
      }),
    [campanha?.status, ativos, relatorio]
  );

  useEffect(() => {
    if (!campanha?.id) {
      setRelatorio(null);
      onRelatorioChangeRef.current?.(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const row = await buscarRelatorioCampanha(campanha.id);
        if (cancelled) return;
        setRelatorio(row);
        onRelatorioChangeRef.current?.(row);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setRelatorio(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campanha?.id]);

  useEffect(() => {
    if (!campanha?.id) {
      setLogoUrl(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const url = await resolverUrlLogoCampanhaOuEmpresa(campanha);
        if (!cancelled) setLogoUrl(url);
      } catch {
        if (!cancelled) setLogoUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campanha]);

  async function handleGerar() {
    if (!campanha?.id) return;
    if (relatorio) {
      setViewerOpen(true);
      return;
    }
    if (motivoBloqueio) {
      toast.error(motivoBloqueio);
      return;
    }
    setSaving(true);
    try {
      const row = await gerarRelatorioCampanha(campanha.id, { auditContext });
      setRelatorio(row);
      onRelatorioChangeRef.current?.(row);
      toast.success("Relatório gerado com sucesso.");
      setViewerOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao gerar o relatório."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerar() {
    if (!campanha?.id || !isAdmin) return;
    const ok = window.confirm(
      "Regenerar recalcula todas as categorias com o motor COPSOQ atual (incluindo normalização de escalas) e substitui o snapshot salvo. Relatórios antigos sem essa regeneração continuam com os valores anteriores. Continuar?"
    );
    if (!ok) return;
    setSaving(true);
    try {
      const row = await regenerarRelatorioCampanha(campanha.id, {
        auditContext,
      });
      setRelatorio(row);
      onRelatorioChangeRef.current?.(row);
      toast.success("Relatório regenerado.");
      setViewerOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Falha ao regenerar o relatório."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!campanha) {
    return (
      <p className="rounded-xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-6 text-center text-sm text-app-muted">
        Crie a pesquisa para gerar o relatório final.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-app-muted">Carregando relatório…</p>
    );
  }

  if (!relatorio) {
    return (
      <div className="flex h-full flex-col justify-between gap-3">
        <p className="text-sm text-app-muted">
          O relatório final consolida as respostas COPSOQ e fica persistido para
          consulta e exportação.
        </p>
        {motivoBloqueio &&
        motivoBloqueio !==
          "Já existe um relatório para esta campanha. Use Visualizar ou Regenerar (admin)." ? (
          <p className="text-xs font-medium text-[#b45309]">{motivoBloqueio}</p>
        ) : null}
        <button
          type="button"
          className="w-fit rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          disabled={saving || Boolean(motivoBloqueio)}
          title={motivoBloqueio ?? "Gerar relatório final"}
          onClick={() => void handleGerar()}
        >
          {saving ? "Gerando…" : "Gerar Relatório"}
        </button>
      </div>
    );
  }

  const { data, hora } = formatDataHoraRelatorio(relatorio.gerado_em);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-xl border border-[#dcfce7] bg-[#f0fdf4] px-3 py-2.5">
        <p className="text-xs font-extrabold text-brand-green">
          ✔ Relatório gerado
        </p>
        <p className="mt-1 text-xs text-navy">
          {data} · {hora}
        </p>
        <p className="text-xs text-app-muted">
          Responsável: {relatorio.gerado_por || "—"}
        </p>
        <p className="mt-1 text-xs text-app-muted">
          Participação:{" "}
          {formatTaxaParticipacao(relatorio.taxa_participacao)} ·{" "}
          {relatorio.respondentes}/{relatorio.participantes} respondentes
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-brand-blue px-3 py-2 text-xs font-bold text-white"
          onClick={() => setViewerOpen(true)}
        >
          Visualizar relatório
        </button>
        <button
          type="button"
          className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy"
          onClick={() => {
            setViewerOpen(true);
            window.setTimeout(() => {
              void (async () => {
                try {
                  const empresa =
                    relatorio.empresa_nome ||
                    relatorio.resultado_json?.capa?.empresaNome ||
                    "Empresa";
                  const { exportarRelatorioRiscosPdf, nomeArquivoPdfRelatorioRiscos } =
                    await import("@/lib/riscos-relatorio-pdf");
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
                    err instanceof Error
                      ? err.message
                      : "Falha ao exportar o PDF."
                  );
                }
              })();
            }, 400);
          }}
        >
          Exportar PDF
        </button>
        {isAdmin ? (
          <button
            type="button"
            className="rounded-xl border border-[#e2e8f0] px-3 py-2 text-xs font-bold text-navy disabled:opacity-40"
            disabled={saving}
            onClick={() => void handleRegenerar()}
          >
            Regenerar
          </button>
        ) : null}
      </div>

      <RiscosRelatorioViewerModal
        open={viewerOpen}
        relatorio={relatorio}
        onClose={() => setViewerOpen(false)}
        logoUrl={logoUrl}
        empresaCnpj={campanha.cnpj}
        campanhaStatus={campanha.status}
      />
    </div>
  );
}
