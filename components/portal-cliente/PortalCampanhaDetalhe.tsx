"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PortalEvolucaoRiscos } from "@/components/portal-cliente/PortalEvolucaoRiscos";
import { PortalGraficoResultadoGeral } from "@/components/portal-cliente/PortalGraficoResultadoGeral";
import { IconFileText } from "@/components/ui/icons/OutlineIcons";
import { formatDateBR } from "@/lib/format";
import {
  PORTAL_PRIVACIDADE_CURTA,
  PORTAL_RESULTADOS_AGUARDANDO_MSG,
  labelStatusClientePortal,
  montarPrincipaisResultadosPortal,
  pathPortalRelatorioPdf,
  type PortalCategoriaResumo,
  type PortalResumo,
} from "@/lib/portal-cliente";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";

const CARD = "rounded-2xl border border-[#e8edf5] bg-white";

export function PortalCampanhaDetalhe({
  resumo,
  clienteId,
  onVoltarLista,
}: {
  resumo: PortalResumo;
  clienteId: string;
  onVoltarLista: () => void;
}) {
  const temResultados = resumo.relatorioDisponivel;
  const pct = resumo.participacaoPercentual;
  const statusLabel = labelStatusClientePortal({
    statusPortal: resumo.statusPortal,
    statusCampanha: resumo.statusCampanha,
  });
  const principais = montarPrincipaisResultadosPortal(resumo);
  const [participantesAbertos, setParticipantesAbertos] = useState(false);
  const [categoriasAbertas, setCategoriasAbertas] = useState(false);
  const [baixandoPdf, setBaixandoPdf] = useState(false);

  const cicloLabel =
    resumo.ciclo != null ? `Ciclo ${resumo.ciclo}` : "Avaliação";
  const periodo =
    resumo.dataInicio && resumo.dataEncerramento
      ? formatPeriodoCampanha(resumo.dataInicio, resumo.dataEncerramento)
      : null;

  async function handleBaixarPdf() {
    if (!resumo.relatorioDisponivel || !resumo.campanhaId) {
      toast.error("Relatório ainda não disponível.");
      return;
    }
    const path = pathPortalRelatorioPdf(resumo.campanhaId, clienteId);
    if (!path) {
      toast.error("Campanha inválida para o relatório.");
      return;
    }
    setBaixandoPdf(true);
    try {
      const res = await fetch(path, { cache: "no-store" });
      if (!res.ok) {
        toast.error("Não foi possível baixar o relatório.");
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? "Relatorio_Riscos_Psicossociais.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível baixar o relatório.");
    } finally {
      setBaixandoPdf(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        className="w-fit text-sm font-semibold text-[#64748b] transition hover:text-[#0b1f4d]"
        onClick={onVoltarLista}
      >
        ← Voltar para avaliações
      </button>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[#0b1f4d]">
              {cicloLabel}
            </h1>
            {periodo ? (
              <p className="mt-1 text-sm text-[#64748b]">{periodo}</p>
            ) : null}
          </div>
          <span className="inline-flex rounded-full bg-[#0b1f4d] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white">
            {statusLabel}
          </span>
        </div>
        <p className="text-sm font-semibold text-[#0b1f4d]">
          {resumo.respondidos} de {resumo.cadastrados} colaboradores participaram
          {pct != null ? ` · ${pct}%` : ""}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-[#eef2f7]">
          <div
            className="h-full rounded-full bg-[#0b1f4d]"
            style={{ width: `${Math.min(100, Math.max(0, pct ?? 0))}%` }}
          />
        </div>
      </header>

      {temResultados ? (
        <>
          <section className={`${CARD} px-4 py-3.5 sm:px-5`}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FaixaDado
                label="Participação"
                value={pct == null ? "—" : `${pct}%`}
              />
              <FaixaDado
                label="Participantes"
                value={`${resumo.respondidos} de ${resumo.cadastrados}`}
              />
              <FaixaDado
                label="Resultado"
                value={`${resumo.categoriasFavoraveis.length} favoráveis · ${resumo.categoriasAtencao.length} em atenção · ${resumo.categoriasDesfavoraveis.length} desfavoráveis`}
              />
            </div>
          </section>

          <section className={`${CARD} px-4 py-4 sm:px-5`}>
            <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
              Resultado geral
            </h2>
            <div className="mt-4">
              <PortalGraficoResultadoGeral
                favoraveis={resumo.categoriasFavoraveis.length}
                atencao={resumo.categoriasAtencao.length}
                desfavoraveis={resumo.categoriasDesfavoraveis.length}
              />
            </div>
          </section>

          <section className={`${CARD} px-4 py-4 sm:px-5`}>
            <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
              Principais resultados
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold text-[#166534]">
                  Pontos positivos
                </h3>
                {principais.positivos.length === 0 ? (
                  <p className="mt-2 text-sm text-[#64748b]">
                    Nenhuma categoria favorável neste ciclo.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {principais.positivos.map((item) => (
                      <li
                        key={item.id}
                        className="text-sm leading-snug text-[#166534]"
                      >
                        ✓ {item.nome}
                      </li>
                    ))}
                  </ul>
                )}
                {principais.positivosOcultos > 0 ? (
                  <p className="mt-2 text-sm text-[#64748b]">
                    +{principais.positivosOcultos} outras categorias favoráveis
                  </p>
                ) : null}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#854d0e]">
                  Pontos de atenção
                </h3>
                {principais.semDesfavoraveis ? (
                  <p className="mt-2 text-sm text-[#64748b]">
                    Nenhuma categoria em situação desfavorável neste ciclo.
                  </p>
                ) : null}
                {principais.pontosAtencao.length === 0 ? (
                  !principais.indicadorComplementarAtencao ? (
                    <p className="mt-2 text-sm text-[#64748b]">
                      Nenhum ponto de atenção neste ciclo.
                    </p>
                  ) : null
                ) : (
                  <ul className="mt-2 space-y-2">
                    {principais.pontosAtencao.map((item) => (
                      <li key={item.id}>
                        <p className="text-sm font-medium leading-snug text-[#0f172a]">
                          ⚠ {item.nome}
                        </p>
                        <p className="text-xs text-[#64748b]">{item.label}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {principais.atencaoOcultos > 0 ? (
                  <p className="mt-2 text-sm text-[#64748b]">
                    +{principais.atencaoOcultos} outras categorias
                  </p>
                ) : null}
                {principais.indicadorComplementarAtencao ? (
                  <div className="mt-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#92400e]">
                      Indicadores complementares
                    </p>
                    <p className="mt-1 text-sm text-[#92400e]">
                      ⚠ Comportamentos ofensivos
                      {principais.indicadorComplementarLabel
                        ? ` — ${principais.indicadorComplementarLabel}`
                        : ""}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="mt-4 text-sm font-semibold text-[#0b1f4d] transition hover:text-[#12316f]"
              aria-expanded={categoriasAbertas}
              onClick={() => setCategoriasAbertas((v) => !v)}
            >
              {categoriasAbertas
                ? "Ocultar categorias"
                : "Ver todas as categorias"}
            </button>
            {categoriasAbertas ? (
              <TodasCategorias resumo={resumo} />
            ) : null}
          </section>

          <PortalEvolucaoRiscos
            key={resumo.historicoRiscos.map((c) => c.campanhaId).join("|")}
            historico={resumo.historicoRiscos}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RelatorioCard
              ciclo={resumo.ciclo}
              geradoEm={resumo.relatorioGeradoEm}
              baixando={baixandoPdf}
              onBaixar={() => void handleBaixarPdf()}
            />
            <ParticipantesCard
              resumo={resumo}
              aberto={participantesAbertos}
              onToggle={() => setParticipantesAbertos((v) => !v)}
            />
          </div>
        </>
      ) : (
        <>
          <section className={`${CARD} px-4 py-4 sm:px-5`}>
            <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
              Participação
            </h2>
            <p className="mt-2 text-sm text-[#0b1f4d]">
              {resumo.respondidos} de {resumo.cadastrados} colaboradores
              concluíram
            </p>
            <p className="mt-1 text-sm text-[#64748b]">
              {resumo.pendentes} pendente{resumo.pendentes === 1 ? "" : "s"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[#64748b]">
              {PORTAL_RESULTADOS_AGUARDANDO_MSG}
            </p>
          </section>
          <ParticipantesCard
            resumo={resumo}
            aberto={participantesAbertos}
            onToggle={() => setParticipantesAbertos((v) => !v)}
          />
        </>
      )}
    </div>
  );
}

function FaixaDado({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-[#0b1f4d] sm:text-base">
        {value}
      </p>
    </div>
  );
}

function RelatorioCard({
  ciclo,
  geradoEm,
  baixando,
  onBaixar,
}: {
  ciclo: number | null;
  geradoEm: string | null;
  baixando: boolean;
  onBaixar: () => void;
}) {
  return (
    <section className={`${CARD} px-4 py-4 sm:px-5`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#0b1f4d]">
          <IconFileText size={16} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
            Relatório Técnico
            {ciclo != null ? ` — Ciclo ${ciclo}` : ""}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[#64748b]">
            Relatório consolidado da Avaliação de Riscos Psicossociais.
          </p>
          <p className="mt-2 text-sm text-[#334155]">
            Gerado em {formatDateBR(geradoEm)}
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center rounded-lg bg-[#0b1f4d] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[#12316f] disabled:opacity-60"
            disabled={baixando}
            onClick={onBaixar}
          >
            {baixando ? "Preparando PDF..." : "Baixar relatório em PDF"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ParticipantesCard({
  resumo,
  aberto,
  onToggle,
}: {
  resumo: PortalResumo;
  aberto: boolean;
  onToggle: () => void;
}) {
  return (
    <section className={`${CARD} px-4 py-4 sm:px-5`}>
      <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
        Participantes
      </h2>
      <p className="mt-1 text-sm text-[#64748b]">
        {resumo.respondidos} colaboradores participam desta avaliação
      </p>
      <button
        type="button"
        className="mt-3 text-sm font-semibold text-[#0b1f4d] transition hover:text-[#12316f]"
        aria-expanded={aberto}
        onClick={onToggle}
      >
        {aberto ? "Ocultar participantes" : "Ver participantes"}
      </button>
      {aberto ? (
        <ul className="mt-3 divide-y divide-[#f1f5f9]">
          {resumo.participantes.length === 0 ? (
            <li className="py-2 text-sm text-[#94a3b8]">
              Nenhum participante cadastrado.
            </li>
          ) : (
            resumo.participantes.map((p, index) => (
              <li
                key={`${p.nome}-${index}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 break-words text-sm font-medium text-[#1e293b]">
                  {p.participacao === "concluida" ? "✓ " : "○ "}
                  {p.nome}
                </span>
                <span
                  className={`shrink-0 text-[11px] font-semibold ${
                    p.participacao === "concluida"
                      ? "text-[#166534]"
                      : "text-[#64748b]"
                  }`}
                >
                  {p.participacao === "concluida"
                    ? "Participação concluída"
                    : "Pendente"}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-[#64748b]">
        🔒 {PORTAL_PRIVACIDADE_CURTA}
      </p>
    </section>
  );
}

function TodasCategorias({ resumo }: { resumo: PortalResumo }) {
  const grupos = useMemo(
    () =>
      [
        {
          titulo: "Favoráveis",
          itens: resumo.categoriasFavoraveis,
          className: "text-[#166534]",
        },
        {
          titulo: "Em atenção",
          itens: resumo.categoriasAtencao,
          className: "text-[#854d0e]",
        },
        {
          titulo: "Desfavoráveis",
          itens: resumo.categoriasDesfavoraveis,
          className: "text-[#9f1239]",
        },
      ] as Array<{
        titulo: string;
        itens: PortalCategoriaResumo[];
        className: string;
      }>,
    [resumo]
  );

  return (
    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
      {grupos.map((grupo) => (
        <div key={grupo.titulo} className="rounded-xl border border-[#eef2f7] px-3 py-2.5">
          <p className={`text-xs font-semibold uppercase tracking-wide ${grupo.className}`}>
            {grupo.titulo}
          </p>
          {grupo.itens.length === 0 ? (
            <p className="mt-1.5 text-xs text-[#94a3b8]">Nenhuma nesta faixa.</p>
          ) : (
            <ul className="mt-1.5 space-y-1">
              {grupo.itens.map((item) => (
                <li key={item.id} className={`text-sm leading-snug ${grupo.className}`}>
                  {item.nome}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
