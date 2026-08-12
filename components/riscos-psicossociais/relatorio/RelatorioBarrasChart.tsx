"use client";

import { useState } from "react";
import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  formatPontuacaoComMaximo,
  montarDadosBarras,
  type BarraChartDatum,
} from "@/lib/riscos-relatorio-view";
import { RelatorioLegendaCores } from "@/components/riscos-psicossociais/relatorio/RelatorioLegendaCores";
import { COPSOQ_PERGUNTAS } from "@/lib/copsoq/perguntas";

function labelTipo(tipo: string): string {
  return String(tipo).toUpperCase() === "RISCO" ? "Risco" : "Proteção";
}

function qtdPerguntasDimensao(dimensaoId: string): number {
  return COPSOQ_PERGUNTAS.filter(
    (p) => p.dimensaoId === dimensaoId && p.entraNoCalculo
  ).length;
}

function DimensaoBarraRow({ row }: { row: BarraChartDatum }) {
  const [openExtra, setOpenExtra] = useState(false);
  const pontuacao = formatPontuacaoComMaximo(row.media, row.maxEscala);
  const pct = Math.max(0, Math.min(100, row.valorVisual * 100));
  const qtdPerguntas = qtdPerguntasDimensao(row.id);

  return (
    <li className="relatorio-barra-row group relative border-b border-[#eef2f7] py-4 last:border-b-0 sm:py-3.5">
      {/* Mobile: empilhado */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <p className="text-[13px] font-extrabold leading-snug text-navy">
          {row.nome}
        </p>
        <div
          className="h-3.5 w-full overflow-hidden rounded-full bg-[#eef2f7]"
          role="img"
          aria-label={`Favorabilidade visual ${pct.toFixed(0)}%`}
        >
          <div
            className="relatorio-barra-fill h-full rounded-full transition-[width]"
            style={{ width: `${pct}%`, backgroundColor: row.cor }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-extrabold tabular-nums text-navy">
            {pontuacao}
          </p>
          <span
            className="relatorio-barra-badge inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold text-white"
            style={{ backgroundColor: row.cor }}
          >
            {row.classificacaoLabel}
          </span>
        </div>
      </div>

      {/* Desktop: Nome → Barra → Pontuação → Badge */}
      <div className="hidden items-center gap-4 sm:flex">
        <p className="w-[11.5rem] shrink-0 text-[13px] font-extrabold leading-snug text-navy lg:w-52">
          {row.nome}
        </p>
        <div
          className="h-4 min-w-0 flex-1 overflow-hidden rounded-full bg-[#eef2f7]"
          role="img"
          aria-label={`Favorabilidade visual ${pct.toFixed(0)}%`}
        >
          <div
            className="relatorio-barra-fill h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: row.cor }}
          />
        </div>
        <p className="w-[4.75rem] shrink-0 text-right text-sm font-extrabold tabular-nums text-navy">
          {pontuacao}
        </p>
        <span
          className="relatorio-barra-badge inline-flex w-[9.5rem] shrink-0 justify-center rounded-full px-2.5 py-1 text-center text-[10px] font-extrabold leading-tight text-white lg:w-40"
          style={{ backgroundColor: row.cor }}
        >
          {row.classificacaoLabel}
        </span>
      </div>

      {/* Extra: hover no desktop; botão no mobile — nunca essencial */}
      <button
        type="button"
        className="mt-1.5 text-[10px] font-semibold text-[#94a3b8] underline-offset-2 hover:text-brand-blue hover:underline riscos-relatorio-print-hide sm:absolute sm:right-0 sm:top-1 sm:mt-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
        onClick={() => setOpenExtra((v) => !v)}
        aria-expanded={openExtra}
      >
        {openExtra ? "Ocultar detalhes" : "Detalhes"}
      </button>
      {openExtra ? (
        <div className="mt-2 rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3 py-2 text-[11px] leading-relaxed text-app-muted riscos-relatorio-print-hide">
          <p>
            Tipo:{" "}
            <span className="font-bold text-navy">{labelTipo(row.tipo)}</span>
          </p>
          {qtdPerguntas > 0 ? (
            <p className="mt-0.5">
              Perguntas:{" "}
              <span className="font-bold text-navy">{qtdPerguntas}</span>
            </p>
          ) : null}
          <p className="mt-0.5">
            Respondentes válidos:{" "}
            <span className="font-bold text-navy">
              {row.respondentesValidos}
            </span>
          </p>
          {row.descricao ? (
            <p className="mt-1 text-[11px] text-[#64748b]">{row.descricao}</p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

export function RelatorioBarrasChart({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const data = montarDadosBarras(dimensoes);

  if (data.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Comparativo
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
            Resultado das dimensões
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-app-muted sm:text-sm">
            O comprimento da barra indica favorabilidade visual. Em dimensões de
            risco, pontuações técnicas menores geram barras maiores. Pontuação e
            classificação ficam sempre visíveis (incluindo no PDF).
          </p>
        </div>
        <RelatorioLegendaCores />
      </div>

      <div className="rounded-3xl border border-[#e8edf5] bg-white px-4 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:px-6 sm:py-3">
        <ul className="relatorio-barras-lista divide-y-0">
          {data.map((row) => (
            <DimensaoBarraRow key={row.id} row={row} />
          ))}
        </ul>
      </div>
    </section>
  );
}
