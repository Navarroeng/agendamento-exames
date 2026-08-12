"use client";

import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  bgSuavePorClassificacaoId,
  corPorClassificacaoId,
  formatPontuacaoComMaximo,
  rankingGeralPorFavorabilidade,
  valorVisualBarraDimensao,
} from "@/lib/riscos-relatorio-view";

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
      className="relatorio-barra-row border-b border-[#eef2f7] px-3 py-3 last:border-b-0 sm:px-4 sm:py-3.5"
      style={{ backgroundColor: posicao <= 3 ? bg : undefined }}
    >
      {/* Mobile */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <div className="flex items-start gap-2.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${posicaoMedalhaClass(posicao)}`}
          >
            {posicao}º
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-extrabold leading-snug text-navy">
              {d.nome}
            </p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              {labelTipo(d.tipo)}
            </p>
          </div>
        </div>
        <div
          className="h-3.5 w-full overflow-hidden rounded-full bg-[#eef2f7]"
          role="img"
          aria-label={`Favorabilidade visual ${pct.toFixed(0)}%`}
        >
          <div
            className="relatorio-barra-fill h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: cor }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-extrabold tabular-nums text-navy">
            {pontuacao}
          </p>
          <span
            className="relatorio-barra-badge inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white"
            style={{ backgroundColor: cor }}
          >
            {d.classificacaoLabel}
          </span>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden items-center gap-3 sm:flex lg:gap-4">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${posicaoMedalhaClass(posicao)}`}
        >
          {posicao}º
        </span>
        <div className="w-[11rem] shrink-0 lg:w-52">
          <p className="text-[13px] font-extrabold leading-snug text-navy">
            {d.nome}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {labelTipo(d.tipo)}
          </p>
        </div>
        <div
          className="h-3.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef2f7]"
          role="img"
          aria-label={`Favorabilidade visual ${pct.toFixed(0)}%`}
        >
          <div
            className="relatorio-barra-fill h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: cor }}
          />
        </div>
        <p className="w-[4.75rem] shrink-0 text-right text-sm font-extrabold tabular-nums text-navy">
          {pontuacao}
        </p>
        <span
          className="relatorio-barra-badge inline-flex w-[9.5rem] shrink-0 justify-center rounded-full px-2.5 py-1 text-center text-[10px] font-extrabold leading-tight text-white lg:w-40"
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
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Priorização
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
          Ranking Geral das Categorias
        </h3>
        <p className="mt-1 max-w-2xl text-xs text-app-muted sm:text-sm">
          Ordenação automática considerando a favorabilidade da categoria,
          respeitando se a categoria é de RISCO ou PROTEÇÃO.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#e8edf5] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <ol className="relatorio-barras-lista">
          {ranking.map((d, idx) => (
            <RankingLinha key={d.id} d={d} posicao={idx + 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}
