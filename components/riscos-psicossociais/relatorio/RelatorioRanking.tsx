"use client";

import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  bgSuavePorClassificacaoId,
  corPorClassificacaoId,
  formatMediaRelatorio,
  montarRankingAtencao,
  rankingMelhores,
  scoreFavorabilidade,
} from "@/lib/riscos-relatorio-view";

function RankingItem({
  d,
  idx,
}: {
  d: RiscosRelatorioDimensaoSnapshot;
  idx: number;
}) {
  return (
    <li
      className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5"
      style={{
        backgroundColor: bgSuavePorClassificacaoId(d.classificacaoId),
      }}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-extrabold text-white">
        {idx + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-extrabold text-navy">{d.nome}</p>
        <p className="text-[11px] text-app-muted">
          Padronizada {formatMediaRelatorio(d.media)}
          {d.mediaBruta != null
            ? ` · original ${formatMediaRelatorio(d.mediaBruta)}`
            : ""}{" "}
          · {d.classificacaoLabel}
          <span className="text-[#94a3b8]">
            {" "}
            · favorabilidade {formatMediaRelatorio(scoreFavorabilidade(d))}
          </span>
        </p>
      </div>
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: corPorClassificacaoId(d.classificacaoId) }}
        aria-hidden
      />
    </li>
  );
}

function RankingMelhoresCard({
  itens,
}: {
  itens: RiscosRelatorioDimensaoSnapshot[];
}) {
  return (
    <div className="rounded-3xl border border-[#bbf7d0] bg-gradient-to-b from-[#f0fdf4] to-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <h4 className="text-sm font-extrabold text-navy">Top 5 melhores</h4>
      <p className="mt-1 text-[11px] text-app-muted">
        Maior favorabilidade (RISCO: pontuação baixa; PROTEÇÃO: pontuação alta).
      </p>
      <ol className="mt-3 space-y-2">
        {itens.length === 0 ? (
          <li className="text-xs text-app-muted">Sem dados suficientes.</li>
        ) : (
          itens.map((d, idx) => <RankingItem key={d.id} d={d} idx={idx} />)
        )}
      </ol>
    </div>
  );
}

function RankingAtencaoCard({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const ranking = montarRankingAtencao(dimensoes, 5);

  return (
    <div className="rounded-3xl border border-[#fde68a] bg-gradient-to-b from-[#fefce8] to-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
      <h4 className="text-sm font-extrabold text-navy">
        Top 5 que merecem atenção
      </h4>
      {ranking.semRiscosClassificados ? (
        <p className="mt-3 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2.5 text-xs font-semibold leading-relaxed text-[#166534]">
          Nenhuma dimensão apresenta Risco Intermediário ou Risco para a Saúde.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-app-muted">
            Prioriza classificação oficial (Risco para a Saúde → Risco
            Intermediário); depois menor favorabilidade.
          </p>
          <ol className="mt-3 space-y-2">
            {ranking.itens.map((d, idx) => (
              <RankingItem key={d.id} d={d} idx={idx} />
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

export function RelatorioRanking({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const melhores = rankingMelhores(dimensoes, 5);

  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Priorização
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
          Ranking das dimensões
        </h3>
        <p className="mt-1 text-xs text-app-muted sm:text-sm">
          Ordenação pela favorabilidade (escala comum 0–4), respeitando se a
          dimensão é RISCO ou PROTEÇÃO. A classificação oficial do motor não é
          recalculada.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankingMelhoresCard itens={melhores} />
        <RankingAtencaoCard dimensoes={dimensoes} />
      </div>
    </section>
  );
}
