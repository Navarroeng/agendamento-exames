"use client";

import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import { analisarDimensaoRelatorio } from "@/lib/riscos-relatorio-conteudo";
import {
  bgSuavePorClassificacaoId,
  corPorClassificacaoId,
  formatMediaRelatorio,
  formatPontuacaoComMaximo,
  snapshotTemNormalizacao,
} from "@/lib/riscos-relatorio-view";

function DimensaoCard({ d }: { d: RiscosRelatorioDimensaoSnapshot }) {
  const cor = corPorClassificacaoId(d.classificacaoId);
  const bg = bgSuavePorClassificacaoId(d.classificacaoId);
  const analise = analisarDimensaoRelatorio(d);
  const comNorm = snapshotTemNormalizacao(d);
  const pontuacao = comNorm
    ? formatPontuacaoComMaximo(
        d.media,
        d.maxEscalaPadronizada ?? d.maxEscalaBruta ?? 4
      )
    : formatMediaRelatorio(d.media);
  const tipoLabel =
    String(d.tipo).toUpperCase() === "RISCO" ? "RISCO" : "PROTEÇÃO";

  return (
    <article
      className="riscos-relatorio-print-card rounded-xl border border-[#e8edf5] bg-white"
      style={{
        borderTopColor: cor,
        borderTopWidth: 3,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-extrabold leading-snug text-navy">
            {d.nome}
          </h4>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {tipoLabel}
          </p>
        </div>
        <span
          className="inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold text-white"
          style={{ backgroundColor: cor }}
        >
          {d.classificacaoLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-[#eef2f7] px-3.5 py-2">
        <div className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: bg }}>
          <p className="text-[8px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Pontuação
          </p>
          <p className="text-sm font-extrabold tabular-nums text-navy">
            {pontuacao}
          </p>
        </div>
        <div className="rounded-lg bg-[#f8fafc] px-2.5 py-1.5">
          <p className="text-[8px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Respondentes
          </p>
          <p className="text-sm font-extrabold tabular-nums text-navy">
            {d.respondentesValidos}
          </p>
        </div>
      </div>

      <div className="relatorio-dimensoes-analise grid grid-cols-2 border-t border-[#eef2f7]">
        <div className="border-b border-r border-[#eef2f7] px-3 py-2">
          <p className="text-[8px] font-bold uppercase tracking-wide text-[#94a3b8]">
            O que avalia
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-navy">
            {analise.oQueAvalia}
          </p>
        </div>
        <div className="border-b border-[#eef2f7] px-3 py-2">
          <p className="text-[8px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Resultado encontrado
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-navy">
            {analise.resultadoEncontrado}
          </p>
        </div>
        <div className="border-r border-[#eef2f7] px-3 py-2">
          <p className="text-[8px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Possíveis impactos
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-navy">
            {analise.possiveisImpactos}
          </p>
        </div>
        <div className="px-3 py-2">
          <p className="text-[8px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Recomendações
          </p>
          <ul className="mt-0.5 space-y-0.5 text-[10px] leading-snug text-navy">
            {analise.recomendacoes.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

export function RelatorioDimensoesCards({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const list = dimensoes.filter((d) => d.entraNoCalculo);

  return (
    <section className="relatorio-detalhamento-copsoq">
      <header className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
          Detalhamento
        </p>
        <h3 className="mt-2 text-base font-extrabold text-navy sm:text-lg">
          Categorias COPSOQ
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-app-muted">
          Análise técnica por categoria — pontuação na escala impressa e
          classificação do sistema.
        </p>
      </header>
      <div className="relatorio-dimensoes-grid grid grid-cols-1 gap-3">
        {list.map((d) => (
          <DimensaoCard key={d.id} d={d} />
        ))}
      </div>
    </section>
  );
}
