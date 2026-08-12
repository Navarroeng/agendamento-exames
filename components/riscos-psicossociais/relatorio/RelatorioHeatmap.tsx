"use client";

import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  corPorClassificacaoId,
  dimensoesParaCalculo,
  formatMediaRelatorio,
} from "@/lib/riscos-relatorio-view";
import { RelatorioLegendaCores } from "@/components/riscos-psicossociais/relatorio/RelatorioLegendaCores";

export function RelatorioHeatmap({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const itens = dimensoesParaCalculo(dimensoes);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Leitura rápida
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
            Heatmap das dimensões
          </h3>
          <p className="mt-1 text-xs text-app-muted sm:text-sm">
            Visão consolidada por classificação — ideal para triagem executiva.
          </p>
        </div>
        <RelatorioLegendaCores />
      </div>

      <div className="overflow-hidden rounded-3xl border border-[#e8edf5] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        {itens.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-app-muted">
            Sem dimensões para exibir.
          </p>
        ) : (
          <ul className="divide-y divide-[#eef2f7]">
            {itens.map((d) => {
              const cor = corPorClassificacaoId(d.classificacaoId);
              return (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: cor,
                      boxShadow: `0 0 0 4px ${cor}33`,
                    }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 text-sm font-extrabold text-navy">
                    {d.nome}
                  </span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white"
                    style={{ backgroundColor: cor }}
                  >
                    {d.classificacaoLabel}
                  </span>
                  <span className="w-20 text-right text-xs font-bold tabular-nums text-app-muted">
                    {formatMediaRelatorio(d.media)}
                    <span className="block text-[9px] font-medium normal-case tracking-normal text-[#94a3b8]">
                      padronizada
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
