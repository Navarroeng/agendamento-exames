"use client";

import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  bgSuavePorClassificacaoId,
  corPorClassificacaoId,
  formatPontuacaoComMaximo,
  rankingGeralPorFavorabilidade,
  valorVisualBarraDimensao,
} from "@/lib/riscos-relatorio-view";
import { RelatorioLegendaCores } from "@/components/riscos-psicossociais/relatorio/RelatorioLegendaCores";

function labelTipo(tipo: string): string {
  return String(tipo).toUpperCase() === "RISCO" ? "RISCO" : "PROTEÇÃO";
}

function posicaoMedalhaClass(posicao: number): string {
  if (posicao === 1) {
    return "bg-[#ca8a04] text-white shadow-[0_0_0_2px_rgba(202,138,4,0.25)]";
  }
  if (posicao === 2) {
    return "bg-[#94a3b8] text-white shadow-[0_0_0_2px_rgba(148,163,184,0.25)]";
  }
  if (posicao === 3) {
    return "bg-[#b45309] text-white shadow-[0_0_0_2px_rgba(180,83,9,0.2)]";
  }
  return "bg-navy text-white";
}

function RankingLinha({
  d,
  posicao,
}: {
  d: RiscosRelatorioDimensaoSnapshot;
  posicao: number;
}) {
  const cor = corPorClassificacaoId(d.classificacaoId);
  const bg = bgSuavePorClassificacaoId(d.classificacaoId);
  const pontuacao = formatPontuacaoComMaximo(
    d.media,
    d.maxEscalaPadronizada ?? d.maxEscalaBruta ?? 4
  );
  const pct = Math.max(
    0,
    Math.min(100, valorVisualBarraDimensao(d) * 100)
  );

  return (
    <li
      className="relatorio-barra-row border-b border-[#eef2f7] px-2.5 py-1.5 last:border-b-0 sm:px-3 sm:py-2"
      style={{ backgroundColor: posicao <= 3 ? bg : undefined }}
    >
      {/* Mobile */}
      <div className="ranking-linha-mobile flex flex-col gap-1.5 sm:hidden">
        <div className="flex items-start gap-2">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${posicaoMedalhaClass(posicao)}`}
          >
            {posicao}º
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold leading-snug text-navy">
              {d.nome}
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
              {labelTipo(d.tipo)}
            </p>
          </div>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-[#eef2f7]"
          role="img"
          aria-label={`Favorabilidade visual ${pct.toFixed(0)}%`}
        >
          <div
            className="relatorio-barra-fill h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: cor }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] font-extrabold tabular-nums text-navy">
            {pontuacao}
          </p>
          <span
            className="relatorio-barra-badge inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white"
            style={{ backgroundColor: cor }}
          >
            {d.classificacaoLabel}
          </span>
        </div>
      </div>

      {/* Desktop / A4 */}
      <div className="ranking-linha-desktop hidden items-center gap-2.5 sm:flex">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${posicaoMedalhaClass(posicao)}`}
        >
          {posicao}º
        </span>
        <div className="w-[10.5rem] shrink-0 lg:w-48">
          <p className="text-[12px] font-extrabold leading-snug text-navy">
            {d.nome}
          </p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {labelTipo(d.tipo)}
          </p>
        </div>
        <div
          className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef2f7]"
          role="img"
          aria-label={`Favorabilidade visual ${pct.toFixed(0)}%`}
        >
          <div
            className="relatorio-barra-fill h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: cor }}
          />
        </div>
        <p className="w-[4.5rem] shrink-0 text-right text-[13px] font-extrabold tabular-nums text-navy">
          {pontuacao}
        </p>
        <span
          className="relatorio-barra-badge inline-flex w-[8.75rem] shrink-0 justify-center rounded-full px-2 py-0.5 text-center text-[9px] font-extrabold leading-tight text-white lg:w-36"
          style={{ backgroundColor: cor }}
        >
          {d.classificacaoLabel}
        </span>
      </div>
    </li>
  );
}

export function RelatorioRanking({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const ranking = rankingGeralPorFavorabilidade(dimensoes);

  if (ranking.length === 0) {
    return null;
  }

  return (
    <section className="relatorio-ranking">
      <header className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
          Priorização
        </p>
        <h3 className="mt-2 text-base font-extrabold text-navy sm:text-lg">
          Ranking Geral das Categorias
        </h3>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-app-muted">
          Ordenação das categorias da maior para a menor favorabilidade,
          considerando a natureza de cada indicador (Risco ou Proteção).
        </p>
        <div className="mt-3.5">
          <RelatorioLegendaCores />
        </div>
      </header>

      <div className="relatorio-ranking-lista overflow-hidden rounded-xl border border-[#e8edf5] bg-white">
        <ol className="relatorio-barras-lista">
          {ranking.map((d, idx) => (
            <RankingLinha key={d.id} d={d} posicao={idx + 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}
