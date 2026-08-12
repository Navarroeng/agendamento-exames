"use client";

import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  bgSuavePorClassificacaoId,
  corPorClassificacaoId,
  formatMediaRelatorio,
  rankingAtencao,
  rankingMelhores,
} from "@/lib/riscos-relatorio-view";

function RankingList({
  titulo,
  tom,
  itens,
}: {
  titulo: string;
  tom: "ok" | "warn";
  itens: RiscosRelatorioDimensaoSnapshot[];
}) {
  const shell =
    tom === "ok"
      ? "border-[#bbf7d0] from-[#f0fdf4] to-white"
      : "border-[#fed7aa] from-[#fff7ed] to-white";

  return (
    <div
      className={`rounded-3xl border bg-gradient-to-b ${shell} p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5`}
    >
      <h4 className="text-sm font-extrabold text-navy">{titulo}</h4>
      <ol className="mt-3 space-y-2">
        {itens.length === 0 ? (
          <li className="text-xs text-app-muted">Sem dados suficientes.</li>
        ) : (
          itens.map((d, idx) => (
            <li
              key={d.id}
              className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 px-3 py-2.5"
              style={{
                backgroundColor: bgSuavePorClassificacaoId(d.classificacaoId),
              }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-extrabold text-white">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-extrabold text-navy">
                  {d.nome}
                </p>
                <p className="text-[11px] text-app-muted">
                  Padronizada {formatMediaRelatorio(d.media)}
                  {d.mediaBruta != null
                    ? ` · original ${formatMediaRelatorio(d.mediaBruta)}`
                    : ""}{" "}
                  · {d.classificacaoLabel}
                </p>
              </div>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: corPorClassificacaoId(d.classificacaoId) }}
                aria-hidden
              />
            </li>
          ))
        )}
      </ol>
    </div>
  );
}

export function RelatorioRanking({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const melhores = rankingMelhores(dimensoes, 5);
  const atencao = rankingAtencao(dimensoes, 5);

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
          Ordenação automática pela classificação oficial e pela favorabilidade
          da média padronizada (escala comum 0–4; RISCO × PROTEÇÃO).
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RankingList
          titulo="Top 5 melhores"
          tom="ok"
          itens={melhores}
        />
        <RankingList
          titulo="Top 5 que merecem atenção"
          tom="warn"
          itens={atencao}
        />
      </div>
    </section>
  );
}
