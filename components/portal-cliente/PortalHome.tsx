"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDateBR } from "@/lib/format";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";
import {
  PORTAL_PREVIEW_INTERNO_LABEL,
  PORTAL_PRIVACIDADE_AVISO,
  PORTAL_RESULTADOS_AGUARDANDO_MSG,
  PORTAL_SELECIONE_EMPRESA_MSG,
  PORTAL_SEM_AVALIACAO_MSG,
  PORTAL_STATUS_LABELS,
  PORTAL_TIMELINE_ETAPAS,
  estadoTimelinePortal,
  type PortalCategoriaResumo,
  type PortalClassificacao,
  type PortalEmpresaOpcao,
  type PortalResumo,
  type PortalStatusHome,
  portalResumoVazio,
} from "@/lib/portal-cliente";

type HomeResponse = {
  ok?: boolean;
  precisaSelecionar?: boolean;
  resumo?: PortalResumo;
  error?: string;
};

type EmpresasResponse = {
  ok?: boolean;
  empresas?: PortalEmpresaOpcao[];
};

const CLASSIFICACAO_VISUAL: Record<
  PortalClassificacao,
  { label: string; dot: string; text: string; bg: string }
> = {
  favoravel: {
    label: "Favorável",
    dot: "bg-[#16a34a]",
    text: "text-[#166534]",
    bg: "bg-[#ecfdf5]",
  },
  atencao: {
    label: "Em atenção",
    dot: "bg-[#ca8a04]",
    text: "text-[#854d0e]",
    bg: "bg-[#fefce8]",
  },
  desfavoravel: {
    label: "Desfavorável",
    dot: "bg-[#dc2626]",
    text: "text-[#991b1b]",
    bg: "bg-[#fef2f2]",
  },
};

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PortalHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = (searchParams.get("cliente") ?? "").trim();

  const [empresas, setEmpresas] = useState<PortalEmpresaOpcao[]>([]);
  const [resumo, setResumo] = useState<PortalResumo>(portalResumoVazio);
  const [carregandoEmpresas, setCarregandoEmpresas] = useState(true);
  const [carregandoHome, setCarregandoHome] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [relatorioAberto, setRelatorioAberto] = useState(false);

  const selecionarEmpresa = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set("cliente", id);
      else params.delete("cliente");
      const qs = params.toString();
      router.replace(qs ? `/portal?${qs}` : "/portal");
    },
    [router, searchParams]
  );

  useEffect(() => {
    let cancel = false;
    async function loadEmpresas() {
      setCarregandoEmpresas(true);
      try {
        const res = await fetch("/api/portal/empresas", { cache: "no-store" });
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const json = (await res.json().catch(() => ({}))) as EmpresasResponse;
        if (!cancel) setEmpresas(json.empresas ?? []);
      } catch {
        if (!cancel) setEmpresas([]);
      } finally {
        if (!cancel) setCarregandoEmpresas(false);
      }
    }
    void loadEmpresas();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    let cancel = false;
    async function loadHome() {
      if (!clienteId) {
        setResumo(portalResumoVazio());
        setErro(null);
        setCarregandoHome(false);
        return;
      }
      setCarregandoHome(true);
      setErro(null);
      try {
        const res = await fetch(
          `/api/portal/home?cliente_id=${encodeURIComponent(clienteId)}`,
          { cache: "no-store" }
        );
        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }
        const json = (await res.json().catch(() => ({}))) as HomeResponse;
        if (cancel) return;
        if (!res.ok) {
          setResumo(portalResumoVazio());
          setErro(PORTAL_SEM_AVALIACAO_MSG);
          return;
        }
        setResumo(json.resumo ?? portalResumoVazio());
      } catch {
        if (!cancel) {
          setResumo(portalResumoVazio());
          setErro(PORTAL_SEM_AVALIACAO_MSG);
        }
      } finally {
        if (!cancel) setCarregandoHome(false);
      }
    }
    void loadHome();
    return () => {
      cancel = true;
    };
  }, [clienteId]);

  const pct = resumo.participacaoPercentual;
  const pesquisaAberta =
    resumo.statusPortal === "aberta" || resumo.statusPortal === "em_andamento";
  const prazoFuturo =
    Boolean(resumo.dataEncerramento) && resumo.dataEncerramento! >= hojeIso();
  const temResultados = resumo.relatorioDisponivel;
  const mostrarHome =
    Boolean(clienteId) &&
    !carregandoHome &&
    resumo.statusPortal !== "sem_avaliacao";

  return (
    <PortalShell>
      <PreviewBar
        empresas={empresas}
        clienteId={clienteId}
        loading={carregandoEmpresas}
        onChange={selecionarEmpresa}
      />

      {carregandoHome ? (
        <p className="py-16 text-center text-sm text-[#64748b]">
          Carregando painel...
        </p>
      ) : null}

      {!carregandoHome && !clienteId ? (
        <EmptyState mensagem={PORTAL_SELECIONE_EMPRESA_MSG} />
      ) : null}

      {!carregandoHome &&
      clienteId &&
      resumo.statusPortal === "sem_avaliacao" ? (
        <EmptyState mensagem={erro ?? PORTAL_SEM_AVALIACAO_MSG} />
      ) : null}

      {mostrarHome ? (
        <>
      <header className="border-b border-[#e8edf5] pb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#94a3b8]">
          {resumo.empresaNome}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-[#0b1f4d] sm:text-[32px]">
              Painel de Riscos Psicossociais
            </h1>
            <p className="mt-2 text-sm text-[#64748b]">
              Ciclo {resumo.ciclo ?? "—"}
              {resumo.dataInicio && resumo.dataEncerramento ? (
                <>
                  {" · "}
                  {formatPeriodoCampanha(
                    resumo.dataInicio,
                    resumo.dataEncerramento
                  )}
                </>
              ) : null}
            </p>
          </div>
          <StatusPill status={resumo.statusPortal} />
        </div>
      </header>

      <PortalTimeline statusPortal={resumo.statusPortal} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Colaboradores cadastrados" value={resumo.cadastrados} />
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
            {prazoFuturo && resumo.dataEncerramento
              ? ` · Prazo até ${formatDateBR(resumo.dataEncerramento)}`
              : ""}
          </p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#e8edf5] bg-white lg:col-span-3">
          <div className="border-b border-[#e8edf5] px-6 py-4">
            <h2 className="text-sm font-semibold text-[#0b1f4d]">
              Acompanhamento dos participantes
            </h2>
          </div>
          <ul className="divide-y divide-[#f1f5f9]">
            {resumo.participantes.length === 0 ? (
              <li className="px-6 py-8 text-sm text-[#94a3b8]">
                Nenhum participante cadastrado.
              </li>
            ) : (
              resumo.participantes.map((p, index) => (
                <li
                  key={`${p.nome}-${index}`}
                  className="flex items-center justify-between gap-4 px-6 py-3.5"
                >
                  <span className="text-sm font-medium text-[#1e293b]">
                    {p.nome}
                  </span>
                  <ParticipacaoBadge participacao={p.participacao} />
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-[#e8edf5] bg-[#f8fafc] px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
              Privacidade das respostas
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-[#64748b]">
              {PORTAL_PRIVACIDADE_AVISO}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
            <h2 className="text-sm font-semibold text-[#0b1f4d]">
              Resultados da avaliação
            </h2>
            {temResultados ? (
              <div className="mt-4 grid grid-cols-1 gap-3">
                <ResultadoGrupo
                  titulo="Categorias favoráveis"
                  itens={resumo.categoriasFavoraveis}
                  tipo="favoravel"
                />
                <ResultadoGrupo
                  titulo="Categorias em atenção"
                  itens={resumo.categoriasAtencao}
                  tipo="atencao"
                />
                {resumo.categoriasDesfavoraveis.length > 0 ? (
                  <ResultadoGrupo
                    titulo="Categorias desfavoráveis"
                    itens={resumo.categoriasDesfavoraveis}
                    tipo="desfavoravel"
                  />
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-[#64748b]">
                {PORTAL_RESULTADOS_AGUARDANDO_MSG}
              </p>
            )}
          </div>

          {temResultados && resumo.pontosAtencao.length > 0 ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
              <h2 className="text-sm font-semibold text-[#0b1f4d]">
                Principais pontos de atenção
              </h2>
              <ul className="mt-4 space-y-3">
                {resumo.pontosAtencao.map((ponto) => (
                  <li key={ponto.id} className="flex items-start gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        ponto.label.toLowerCase().includes("desfavor")
                          ? "bg-[#dc2626]"
                          : "bg-[#ca8a04]"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-[#1e293b]">
                        {ponto.nome}
                      </p>
                      <p className="text-xs text-[#64748b]">{ponto.label}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {temResultados ? (
            <div className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-5">
              <h2 className="text-sm font-semibold text-[#0b1f4d]">
                Relatório técnico disponível
              </h2>
              <p className="mt-1 text-sm text-[#64748b]">
                Gerado em {formatDateBR(resumo.relatorioGeradoEm)}
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center rounded-lg bg-[#0b1f4d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12316f]"
                onClick={() => setRelatorioAberto(true)}
              >
                Visualizar relatório
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {relatorioAberto ? (
        <RelatorioModal resumo={resumo} onClose={() => setRelatorioAberto(false)} />
      ) : null}
        </>
      ) : null}
    </PortalShell>
  );
}

function PreviewBar({
  empresas,
  clienteId,
  loading,
  onChange,
}: {
  empresas: PortalEmpresaOpcao[];
  clienteId: string;
  loading: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[#e8edf5] bg-white px-5 py-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#94a3b8]">
          Modo de visualização
        </p>
        <p className="mt-1 text-xs text-[#64748b]">{PORTAL_PREVIEW_INTERNO_LABEL}</p>
      </div>
      <label className="flex min-w-[240px] flex-1 flex-col gap-1.5 sm:max-w-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
          Visualizar portal de
        </span>
        <select
          className="h-10 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
          value={clienteId}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Selecionar empresa</option>
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nome}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 text-[#0b1f4d]">{children}</div>
  );
}

function EmptyState({ mensagem }: { mensagem: string }) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white px-8 py-20 text-center">
      <p className="text-sm text-[#64748b]">{mensagem}</p>
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

function PortalTimeline({ statusPortal }: { statusPortal: PortalStatusHome }) {
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {PORTAL_TIMELINE_ETAPAS.map((etapa, index) => {
        const estado = estadoTimelinePortal(statusPortal, etapa.id);
        const ativo = estado === "atual";
        const feito = estado === "concluida";
        return (
          <li key={etapa.id} className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  ativo
                    ? "bg-[#0b1f4d] text-white"
                    : feito
                      ? "bg-[#dbeafe] text-[#1d4ed8]"
                      : "bg-[#e2e8f0] text-[#94a3b8]"
                }`}
              >
                {index + 1}
              </span>
              {index < PORTAL_TIMELINE_ETAPAS.length - 1 ? (
                <span className="hidden h-px flex-1 bg-[#e2e8f0] sm:block" />
              ) : null}
            </div>
            <p
              className={`mt-2 text-xs font-semibold ${
                ativo ? "text-[#0b1f4d]" : "text-[#94a3b8]"
              }`}
            >
              {etapa.label}
            </p>
            {ativo && etapa.id === "resultados" && statusPortal === "concluida" ? (
              <p className="text-[10px] text-[#64748b]">Aguardando</p>
            ) : null}
            {ativo && etapa.id === "plano_acao" ? (
              <p className="text-[10px] text-[#64748b]">Próximo</p>
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
    <div className="rounded-2xl border border-[#e8edf5] bg-white px-5 py-5">
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
  titulo,
  itens,
  tipo,
}: {
  titulo: string;
  itens: PortalCategoriaResumo[];
  tipo: PortalClassificacao;
}) {
  const visual = CLASSIFICACAO_VISUAL[tipo];
  return (
    <div className={`rounded-xl px-3.5 py-3 ${visual.bg}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${visual.text}`}>
        {titulo}
        <span className="ml-1 tabular-nums">({itens.length})</span>
      </p>
      {itens.length === 0 ? (
        <p className="mt-1 text-xs text-[#94a3b8]">Nenhuma nesta faixa.</p>
      ) : (
        <ul className="mt-1.5 space-y-0.5">
          {itens.map((item) => (
            <li key={item.id} className={`text-xs ${visual.text}`}>
              {item.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RelatorioModal({
  resumo,
  onClose,
}: {
  resumo: PortalResumo;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1f4d]/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-relatorio-titulo"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2
          id="portal-relatorio-titulo"
          className="text-lg font-semibold text-[#0b1f4d]"
        >
          Relatório técnico
        </h2>
        <p className="mt-1 text-sm text-[#64748b]">
          {resumo.empresaNome} · Ciclo {resumo.ciclo ?? "—"}
          {resumo.relatorioGeradoEm
            ? ` · Gerado em ${formatDateBR(resumo.relatorioGeradoEm)}`
            : ""}
        </p>
        <div className="mt-5 space-y-3">
          <ResultadoGrupo
            titulo="Categorias favoráveis"
            itens={resumo.categoriasFavoraveis}
            tipo="favoravel"
          />
          <ResultadoGrupo
            titulo="Categorias em atenção"
            itens={resumo.categoriasAtencao}
            tipo="atencao"
          />
          {resumo.categoriasDesfavoraveis.length > 0 ? (
            <ResultadoGrupo
              titulo="Categorias desfavoráveis"
              itens={resumo.categoriasDesfavoraveis}
              tipo="desfavoravel"
            />
          ) : null}
        </div>
        {resumo.pontosAtencao.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#94a3b8]">
              Pontos de atenção
            </p>
            <ul className="mt-2 space-y-1">
              {resumo.pontosAtencao.map((p) => (
                <li key={p.id} className="text-sm text-[#1e293b]">
                  {p.nome}
                  <span className="text-[#64748b]"> — {p.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-5 text-xs leading-relaxed text-[#64748b]">
          {PORTAL_PRIVACIDADE_AVISO}
        </p>
        <button
          type="button"
          className="mt-6 w-full rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm font-semibold text-[#0b1f4d] hover:bg-[#f8fafc]"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
