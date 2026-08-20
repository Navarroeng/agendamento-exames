"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { RiscosRelatorioViewerModal } from "@/components/riscos-psicossociais/RiscosRelatorioViewerModal";
import { formatDateBR } from "@/lib/format";
import {
  PORTAL_PRIVACIDADE_AVISO,
  PORTAL_RESULTADOS_AGUARDANDO_MSG,
  PORTAL_STATUS_LABELS,
  PORTAL_TIMELINE_ETAPAS,
  estadoTimelinePortal,
  type PortalCategoriaResumo,
  type PortalClassificacao,
  type PortalResumo,
  type PortalStatusHome,
} from "@/lib/portal-cliente";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";
import {
  exportarRelatorioRiscosPdf,
  nomeArquivoPdfRelatorioRiscos,
} from "@/lib/riscos-relatorio-pdf";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { buscarRelatorioCampanha } from "@/services/riscos-relatorio.service";

const CLASSIFICACAO_VISUAL: Record<
  PortalClassificacao,
  { label: string; titulo: string; text: string; bg: string; border: string; dot: string }
> = {
  favoravel: {
    label: "Favorável",
    titulo: "Categorias Favoráveis",
    text: "text-[#166534]",
    bg: "bg-[#f0fdf4]",
    border: "border-[#dcfce7]",
    dot: "bg-[#86efac]",
  },
  atencao: {
    label: "Em atenção",
    titulo: "Categorias em Atenção",
    text: "text-[#854d0e]",
    bg: "bg-[#fffbeb]",
    border: "border-[#fde68a]",
    dot: "bg-[#fcd34d]",
  },
  desfavoravel: {
    label: "Desfavorável",
    titulo: "Categorias Desfavoráveis",
    text: "text-[#9f1239]",
    bg: "bg-[#fff1f2]",
    border: "border-[#fecdd3]",
    dot: "bg-[#fda4af]",
  },
};

export function PortalAvaliacaoRiscos({
  resumo,
  onVoltar,
}: {
  resumo: PortalResumo;
  onVoltar: () => void;
}) {
  const [relatorio, setRelatorio] = useState<RiscosRelatorioRecord | null>(
    null
  );
  const [viewerOpen, setViewerOpen] = useState(false);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);

  useEffect(() => {
    setRelatorio(null);
    setViewerOpen(false);
  }, [resumo.campanhaId]);

  const empresaNome = resumo.empresaNome || "Empresa";
  const temResultados = resumo.relatorioDisponivel;
  const pesquisaAberta =
    resumo.statusPortal === "aberta" || resumo.statusPortal === "em_andamento";
  const pct = resumo.participacaoPercentual;

  async function carregarRelatorioDaCampanha(): Promise<RiscosRelatorioRecord | null> {
    const campanhaId = resumo.campanhaId;
    if (!campanhaId || !resumo.relatorioDisponivel) return null;
    const row = await buscarRelatorioCampanha(campanhaId);
    if (!row) return null;
    if (row.campanha_id !== campanhaId) {
      throw new Error("O relatório retornado não corresponde a este ciclo.");
    }
    return row;
  }

  async function handleVisualizar() {
    setCarregandoRelatorio(true);
    try {
      const row = await carregarRelatorioDaCampanha();
      if (!row) {
        toast.error("Relatório ainda não disponível.");
        return;
      }
      setRelatorio(row);
      setViewerOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível abrir o relatório."
      );
    } finally {
      setCarregandoRelatorio(false);
    }
  }

  async function handleSalvarPdf() {
    setCarregandoRelatorio(true);
    try {
      const jaCarregado =
        relatorio?.campanha_id === resumo.campanhaId ? relatorio : null;
      const row = jaCarregado ?? (await carregarRelatorioDaCampanha());
      if (!row) {
        toast.error("Relatório ainda não disponível.");
        return;
      }
      setRelatorio(row);
      setViewerOpen(true);
      window.setTimeout(() => {
        void (async () => {
          try {
            const empresa =
              row.empresa_nome ||
              row.resultado_json?.capa?.empresaNome ||
              empresaNome;
            toast.message("Abrindo impressão…", {
              description: `Use “Salvar como PDF”. Nome sugerido: ${nomeArquivoPdfRelatorioRiscos(
                empresa,
                row.gerado_em
              )}`,
            });
            await exportarRelatorioRiscosPdf({
              empresaNome: empresa,
              geradoEm: row.gerado_em,
            });
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Falha ao exportar o PDF."
            );
          }
        })();
      }, 400);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível abrir o relatório."
      );
    } finally {
      setCarregandoRelatorio(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className="w-fit text-sm font-semibold text-[#64748b] transition hover:text-[#0b1f4d]"
        onClick={onVoltar}
      >
        ← Voltar ao portal
      </button>

      <PortalEmpresaIdentidade
        nome={empresaNome}
        logoUrl={resumo.logoUrl}
        variante="avaliacao"
      >
        <p className="mt-2 text-[15px] font-semibold text-[#0b1f4d]">
          Avaliação de Riscos Psicossociais
        </p>
        <p className="mt-1 text-sm text-[#334155]">
          <span className="font-semibold">Ciclo {resumo.ciclo ?? "—"}</span>
          {resumo.dataInicio && resumo.dataEncerramento ? (
            <>
              <span className="text-[#94a3b8]"> · </span>
              Período:{" "}
              {formatPeriodoCampanha(
                resumo.dataInicio,
                resumo.dataEncerramento
              )}
            </>
          ) : null}
        </p>
      </PortalEmpresaIdentidade>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PortalTimeline resumo={resumo} />
        <StatusPill status={resumo.statusPortal} />
      </div>

      <section
        className={`grid grid-cols-2 gap-3 ${
          temResultados ? "lg:grid-cols-5" : "lg:grid-cols-4"
        }`}
      >
        {temResultados ? (
          <>
            <KpiCard
              label="Participação"
              value={pct == null ? "—" : `${pct}%`}
              emphasize
            />
            <KpiCard label="Colaboradores" value={resumo.cadastrados} />
            <KpiCard
              label="Categorias favoráveis"
              value={resumo.categoriasFavoraveis.length}
            />
            <KpiCard
              label="Categorias em atenção"
              value={resumo.categoriasAtencao.length}
            />
            <KpiCard
              label="Categoria desfavorável"
              value={resumo.categoriasDesfavoraveis.length}
            />
          </>
        ) : (
          <>
            <KpiCard
              label="Colaboradores cadastrados"
              value={resumo.cadastrados}
            />
            <KpiCard
              label="Participações concluídas"
              value={resumo.respondidos}
            />
            <KpiCard label="Pendentes" value={resumo.pendentes} />
            <KpiCard
              label="Participação"
              value={pct == null ? "—" : `${pct}%`}
              emphasize
            />
          </>
        )}
      </section>

      <section className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#0b1f4d]">
            Participação da avaliação
          </h2>
          <p className="text-sm tabular-nums text-[#64748b]">
            {resumo.respondidos} de {resumo.cadastrados} colaboradores
            concluíram
            {pct != null ? ` · ${pct}%` : ""}
          </p>
        </div>
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
          <div
            className="h-full rounded-full bg-[#0b1f4d] transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
          />
        </div>
        {pesquisaAberta ? (
          <p className="mt-3 text-sm text-[#64748b]">
            Pesquisa em andamento
            {resumo.dataEncerramento
              ? ` · Prazo até ${formatDateBR(resumo.dataEncerramento)}`
              : ""}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
        <h2 className="text-lg font-semibold tracking-tight text-[#0b1f4d]">
          Resultado da Avaliação
        </h2>
        {temResultados ? (
          <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <ResultadoGrupo
              tipo="favoravel"
              itens={resumo.categoriasFavoraveis}
            />
            <ResultadoGrupo tipo="atencao" itens={resumo.categoriasAtencao} />
            <ResultadoGrupo
              tipo="desfavoravel"
              itens={resumo.categoriasDesfavoraveis}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-[#64748b]">
            {PORTAL_RESULTADOS_AGUARDANDO_MSG}
          </p>
        )}
      </section>

      {temResultados && resumo.pontosAtencao.length > 0 ? (
        <section className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
          <h2 className="text-base font-semibold text-[#0b1f4d]">
            Principais pontos de atenção
          </h2>
          <ul className="mt-4 divide-y divide-[#f1f5f9]">
            {resumo.pontosAtencao.map((ponto) => {
              const critica = /desfavor/i.test(ponto.label);
              return (
                <li
                  key={ponto.id}
                  className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      critica ? "bg-[#fda4af]" : "bg-[#fcd34d]"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-semibold text-[#1e293b]">
                      {ponto.nome}
                    </p>
                    <p className="text-xs text-[#64748b]">{ponto.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {resumo.planoAcaoDisponivel ? (
        <section className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
          <h2 className="text-sm font-semibold text-[#0b1f4d]">Plano de Ação</h2>
          <p className="mt-2 text-sm text-[#64748b]">
            Acompanhe as ações definidas a partir desta avaliação.
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
        <h2 className="text-sm font-semibold text-[#0b1f4d]">
          Relatório Técnico
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          Relatório consolidado da Avaliação de Riscos Psicossociais.
        </p>
        {temResultados ? (
          <>
            <p className="mt-3 text-sm text-[#334155]">
              <span className="font-medium">Gerado em:</span>{" "}
              {formatDateBR(resumo.relatorioGeradoEm)}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center rounded-lg bg-[#0b1f4d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12316f] disabled:opacity-50"
                disabled={carregandoRelatorio}
                onClick={() => void handleVisualizar()}
              >
                {carregandoRelatorio ? "Carregando…" : "Visualizar relatório"}
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-semibold text-[#0b1f4d] transition hover:bg-[#f8fafc] disabled:opacity-50"
                disabled={carregandoRelatorio}
                onClick={() => void handleSalvarPdf()}
              >
                Salvar em PDF
              </button>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm font-medium text-[#64748b]">
            Relatório ainda não disponível
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-[#e8edf5] bg-white">
        <div className="border-b border-[#e8edf5] px-6 py-4">
          <h2 className="text-sm font-semibold text-[#0b1f4d]">
            Acompanhamento dos participantes
          </h2>
        </div>
        <ul className="divide-y divide-[#f1f5f9]">
          {resumo.participantes.length === 0 ? (
            <li className="px-6 py-5 text-sm text-[#94a3b8]">
              Nenhum participante cadastrado.
            </li>
          ) : (
            resumo.participantes.map((p, index) => (
              <li
                key={`${p.nome}-${index}`}
                className="flex items-center justify-between gap-4 px-6 py-3"
              >
                <span className="text-sm font-medium text-[#1e293b]">
                  {p.nome}
                </span>
                <ParticipacaoBadge participacao={p.participacao} />
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#e8edf5] bg-[#f8fafc] px-6 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
          Privacidade das respostas
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-[#64748b]">
          {PORTAL_PRIVACIDADE_AVISO}
        </p>
      </section>

      <RiscosRelatorioViewerModal
        open={viewerOpen}
        relatorio={relatorio}
        onClose={() => setViewerOpen(false)}
        logoUrl={resumo.logoUrl}
        empresaCnpj={resumo.empresaCnpj}
        campanhaStatus={resumo.statusCampanha}
      />
    </div>
  );
}

function StatusPill({ status }: { status: PortalStatusHome }) {
  return (
    <span className="inline-flex rounded-full bg-[#0b1f4d] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white">
      {PORTAL_STATUS_LABELS[status]}
    </span>
  );
}

function PortalTimeline({ resumo }: { resumo: PortalResumo }) {
  return (
    <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-2">
      {PORTAL_TIMELINE_ETAPAS.map((etapa, index) => {
        const estado = estadoTimelinePortal(resumo, etapa.id);
        const ativo = estado === "atual";
        const feito = estado === "concluida";
        return (
          <li key={etapa.id} className="flex items-center gap-1 sm:gap-2">
            <span className="flex items-center gap-1.5">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  ativo
                    ? "bg-[#0b1f4d] text-white"
                    : feito
                      ? "bg-[#dbeafe] text-[#1d4ed8]"
                      : "bg-[#e2e8f0] text-[#94a3b8]"
                }`}
                aria-current={ativo ? "step" : undefined}
              >
                {feito ? "✓" : ativo ? "●" : index + 1}
              </span>
              <span
                className={`hidden text-xs font-semibold sm:inline ${
                  ativo ? "text-[#0b1f4d]" : feito ? "text-[#334155]" : "text-[#94a3b8]"
                }`}
              >
                {etapa.label}
              </span>
            </span>
            {index < PORTAL_TIMELINE_ETAPAS.length - 1 ? (
              <span
                className={`hidden h-px w-4 sm:block ${
                  feito ? "bg-[#93c5fd]" : "bg-[#e2e8f0]"
                }`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function KpiCard({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string | number;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${
          emphasize ? "text-[#0b1f4d]" : "text-[#0f172a]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ParticipacaoBadge({
  participacao,
}: {
  participacao: "concluida" | "pendente";
}) {
  if (participacao === "concluida") {
    return (
      <span className="shrink-0 rounded-full bg-[#ecfdf5] px-2.5 py-1 text-[11px] font-semibold text-[#166534]">
        Participação concluída
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-[#f8fafc] px-2.5 py-1 text-[11px] font-semibold text-[#64748b]">
      Pendente
    </span>
  );
}

function ResultadoGrupo({
  itens,
  tipo,
}: {
  itens: PortalCategoriaResumo[];
  tipo: PortalClassificacao;
}) {
  const visual = CLASSIFICACAO_VISUAL[tipo];
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 ${visual.bg} ${visual.border}`}
    >
      <p
        className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide ${visual.text}`}
      >
        <span className={`h-2 w-2 rounded-full ${visual.dot}`} />
        {visual.titulo}
        <span className="tabular-nums">— {itens.length}</span>
      </p>
      {itens.length === 0 ? (
        <p className="mt-2 text-xs text-[#94a3b8]">Nenhuma nesta faixa.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {itens.map((item) => (
            <li key={item.id} className={`text-sm ${visual.text}`}>
              {item.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
