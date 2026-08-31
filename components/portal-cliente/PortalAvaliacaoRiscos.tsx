"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PortalEmpresaIdentidade } from "@/components/portal-cliente/PortalEmpresaIdentidade";
import { PortalEvolucaoRiscos } from "@/components/portal-cliente/PortalEvolucaoRiscos";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { formatDateBR } from "@/lib/format";
import {
  PORTAL_PRIVACIDADE_AVISO,
  PORTAL_RESULTADOS_AGUARDANDO_MSG,
  PORTAL_STATUS_LABELS,
  PORTAL_TIMELINE_ETAPAS,
  estadoTimelinePortal,
  pathPortalRelatorio,
  type PortalCategoriaResumo,
  type PortalClassificacao,
  type PortalResumo,
  type PortalStatusHome,
} from "@/lib/portal-cliente";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";
import type { StatusGeralIndicadoresComplementares } from "@/lib/riscos-indicadores-complementares";

const CARD = "rounded-2xl border border-[#e8edf5] bg-white";
const PONTOS_INICIAIS = 6;

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
  const empresaNome = resumo.empresaNome || "Empresa";
  const temResultados = resumo.relatorioDisponivel;
  const pesquisaAberta =
    resumo.statusPortal === "aberta" || resumo.statusPortal === "em_andamento";
  const pct = resumo.participacaoPercentual;
  const [pontosExpandidos, setPontosExpandidos] = useState(false);

  function handleVisualizar() {
    const campanhaId = resumo.campanhaId;
    if (!campanhaId || !resumo.relatorioDisponivel) {
      toast.error("Relatório ainda não disponível.");
      return;
    }
    const path = pathPortalRelatorio(campanhaId);
    if (!path) {
      toast.error("Campanha inválida para o relatório.");
      return;
    }
    window.open(path, "_blank", "noopener,noreferrer");
  }

  const pontos = resumo.pontosAtencao;
  const pontosVisiveis =
    pontosExpandidos || pontos.length <= PONTOS_INICIAIS
      ? pontos
      : pontos.slice(0, PONTOS_INICIAIS);

  return (
    <div className="flex flex-col gap-4">
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
        <p className="mt-1 text-sm font-semibold text-[#0b1f4d]">
          Avaliação de Riscos Psicossociais
        </p>
        <p className="mt-0.5 text-sm text-[#475569]">
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

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <PortalTimeline resumo={resumo} />
        <StatusPill status={resumo.statusPortal} />
      </div>

      <section
        className={`grid grid-cols-2 gap-2.5 md:grid-cols-3 ${
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
              label="Categorias Favoráveis"
              value={resumo.categoriasFavoraveis.length}
            />
            <KpiCard
              label="Categorias em Atenção"
              value={resumo.categoriasAtencao.length}
            />
            <KpiCard
              label="Categoria Desfavorável"
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

      <section className={`${CARD} px-5 py-3.5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
            Participação da avaliação
          </h2>
          <p className="text-sm tabular-nums text-[#64748b]">
            {resumo.respondidos} de {resumo.cadastrados} concluíram
            {pct != null ? ` · ${pct}%` : ""}
          </p>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#eef2f7]">
          <div
            className="h-full rounded-full bg-[#0b1f4d] transition-[width] duration-500"
            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
          />
        </div>
        {pesquisaAberta ? (
          <p className="mt-2 text-sm text-[#64748b]">
            Pesquisa em andamento
            {resumo.dataEncerramento
              ? ` · Prazo até ${formatDateBR(resumo.dataEncerramento)}`
              : ""}
          </p>
        ) : null}
      </section>

      <section className={`${CARD} px-5 py-4`}>
        <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
          Resultado da Avaliação
        </h2>
        {temResultados ? (
          <div className="mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-3">
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
          <p className="mt-2.5 text-sm leading-relaxed text-[#64748b]">
            {PORTAL_RESULTADOS_AGUARDANDO_MSG}
          </p>
        )}
      </section>

      {temResultados && resumo.indicadoresComplementaresDisponivel ? (
        <section className={`${CARD} px-5 py-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
                Indicadores complementares
              </h2>
              <p className="mt-0.5 text-xs text-[#64748b]">
                Comportamentos ofensivos · separado das categorias COPSOQ
              </p>
            </div>
            <IndicadoresComplementaresBadge
              status={resumo.indicadoresComplementaresStatus}
              label={resumo.indicadoresComplementaresLabel}
            />
          </div>
        </section>
      ) : null}

      {temResultados && pontos.length > 0 ? (
        <section className={`${CARD} px-5 py-4`}>
          <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
            Principais pontos de atenção
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pontosVisiveis.map((ponto) => {
              const critica = /desfavor/i.test(ponto.label);
              return (
                <li
                  key={ponto.id}
                  className="flex items-start gap-2.5 rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      critica ? "bg-[#fda4af]" : "bg-[#fcd34d]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug text-[#1e293b]">
                      {ponto.nome}
                    </p>
                    <p className="mt-0.5 text-xs text-[#64748b]">{ponto.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          {pontos.length > PONTOS_INICIAIS ? (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-[#0b1f4d] transition hover:text-[#12316f]"
              aria-expanded={pontosExpandidos}
              onClick={() => setPontosExpandidos((v) => !v)}
            >
              {pontosExpandidos
                ? "Mostrar menos"
                : "Ver todos os pontos"}
            </button>
          ) : null}
        </section>
      ) : null}

      <PortalEvolucaoRiscos
        key={resumo.historicoRiscos.map((c) => c.campanhaId).join("|")}
        historico={resumo.historicoRiscos}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className={`${CARD} px-5 py-4`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#0b1f4d]">
              <IconFileText size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
                Relatório Técnico
                {resumo.ciclo != null ? ` — Ciclo ${resumo.ciclo}` : ""}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#64748b]">
                Relatório consolidado da Avaliação de Riscos Psicossociais.
              </p>
              {temResultados ? (
                <>
                  <p className="mt-2 text-sm text-[#334155]">
                    Gerado em {formatDateBR(resumo.relatorioGeradoEm)}
                  </p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center rounded-lg bg-[#0b1f4d] px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-[#12316f]"
                    onClick={handleVisualizar}
                  >
                    Visualizar relatório →
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm font-medium text-[#64748b]">
                  Relatório ainda não disponível
                </p>
              )}
            </div>
          </div>
        </section>

        {resumo.planoAcaoDisponivel ? (
          <section className={`${CARD} px-5 py-4`}>
            <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
              Plano de Ação
            </h2>
            <p className="mt-2 text-sm text-[#64748b]">
              Acompanhe as ações definidas a partir desta avaliação.
            </p>
          </section>
        ) : null}
      </div>

      <section className={CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#e8edf5] px-5 py-3">
          <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
            Participantes
          </h2>
          <p className="text-sm tabular-nums text-[#64748b]">
            {resumo.respondidos} de {resumo.cadastrados} concluíram
            {pct != null ? ` · ${pct}%` : ""}
          </p>
        </div>
        <ul className="divide-y divide-[#f1f5f9]">
          {resumo.participantes.length === 0 ? (
            <li className="px-5 py-4 text-sm text-[#94a3b8]">
              Nenhum participante cadastrado.
            </li>
          ) : (
            resumo.participantes.map((p, index) => (
              <li
                key={`${p.nome}-${index}`}
                className="flex items-center justify-between gap-4 px-5 py-2.5"
              >
                <span className="min-w-0 break-words text-sm font-medium text-[#1e293b]">
                  {p.nome}
                </span>
                <ParticipacaoBadge participacao={p.participacao} />
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-[#e8edf5] bg-[#f8fafc] px-5 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#475569]">
            <LockIcon />
            Privacidade das respostas
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#64748b]">
            {PORTAL_PRIVACIDADE_AVISO}
          </p>
        </div>
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: PortalStatusHome }) {
  return (
    <span className="inline-flex rounded-full bg-[#0b1f4d] px-3 py-1 text-xs font-semibold tracking-wide text-white">
      {PORTAL_STATUS_LABELS[status]}
    </span>
  );
}

function PortalTimeline({ resumo }: { resumo: PortalResumo }) {
  return (
    <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-1.5">
      {PORTAL_TIMELINE_ETAPAS.map((etapa, index) => {
        const estado = estadoTimelinePortal(resumo, etapa.id);
        const ativo = estado === "atual";
        const feito = estado === "concluida";
        return (
          <li key={etapa.id} className="flex items-center gap-1 sm:gap-1.5">
            <span className="flex items-center gap-1.5">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
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
                  ativo
                    ? "text-[#0b1f4d]"
                    : feito
                      ? "text-[#334155]"
                      : "text-[#94a3b8]"
                }`}
              >
                {etapa.label}
              </span>
            </span>
            {index < PORTAL_TIMELINE_ETAPAS.length - 1 ? (
              <span
                className={`hidden h-px w-3 sm:block ${
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

function IndicadoresComplementaresBadge({
  status,
  label,
}: {
  status: StatusGeralIndicadoresComplementares;
  label: string;
}) {
  const styles =
    status === "requer_atencao"
      ? "border-[#fde68a] bg-[#fffbeb] text-[#92400e]"
      : status === "sem_dados" || status === "indisponivel"
        ? "border-[#e2e8f0] bg-[#f8fafc] text-[#64748b]"
        : "border-[#bbf7d0] bg-[#f0fdf4] text-[#166534]";

  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
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
    <div className={`${CARD} px-4 py-3`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${
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
        ✓ Participação concluída
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
      className={`rounded-xl border px-3.5 py-3 ${visual.bg} ${visual.border}`}
    >
      <p
        className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide ${visual.text}`}
      >
        <span className={`h-2 w-2 rounded-full ${visual.dot}`} />
        {visual.titulo}
        <span className="tabular-nums">— {itens.length}</span>
      </p>
      {itens.length === 0 ? (
        <p className="mt-1.5 text-xs text-[#94a3b8]">Nenhuma nesta faixa.</p>
      ) : (
        <ul className="mt-1.5 space-y-0.5">
          {itens.map((item) => (
            <li key={item.id} className={`text-sm leading-snug ${visual.text}`}>
              {item.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
