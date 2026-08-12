"use client";

import { useState } from "react";
import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import { analisarDimensao } from "@/lib/riscos-relatorio-conteudo";
import {
  bgSuavePorClassificacaoId,
  corPorClassificacaoId,
  formatMediaRelatorio,
  formatPontuacaoComMaximo,
  snapshotTemNormalizacao,
} from "@/lib/riscos-relatorio-view";

function orientacaoLeituraPorTipo(tipo: string): string {
  const t = String(tipo).toUpperCase();
  if (t === "RISCO") {
    return "Quanto menor a pontuação, melhor a condição avaliada.";
  }
  return "Quanto maior a pontuação, melhor a condição avaliada.";
}

function DimensaoCard({ d }: { d: RiscosRelatorioDimensaoSnapshot }) {
  const [open, setOpen] = useState(false);
  const cor = corPorClassificacaoId(d.classificacaoId);
  const bg = bgSuavePorClassificacaoId(d.classificacaoId);
  const analise = analisarDimensao(d);
  const comNorm = snapshotTemNormalizacao(d);
  const orientacao = orientacaoLeituraPorTipo(d.tipo);

  return (
    <article
      className="riscos-relatorio-print-card rounded-2xl border border-[#e8edf5] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]"
      style={{ borderTopColor: cor, borderTopWidth: 3 }}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-extrabold text-navy sm:text-[15px]">
              {d.nome}
            </h4>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-app-muted">
              {d.tipo}
            </p>
          </div>
          <span
            className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold text-white"
            style={{ backgroundColor: cor }}
          >
            {d.classificacaoLabel}
          </span>
        </div>

        {comNorm ? (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: bg }}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Pontuação
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {formatPontuacaoComMaximo(
                  d.media,
                  d.maxEscalaPadronizada ?? d.maxEscalaBruta ?? 4
                )}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-[#94a3b8]">
                {orientacao}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Respondentes válidos
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {d.respondentesValidos}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: bg }}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Pontuação
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {formatMediaRelatorio(d.media)}
              </p>
              <p className="mt-1 text-[10px] leading-snug text-[#94a3b8]">
                {orientacao}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Respondentes válidos
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {d.respondentesValidos}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          className="mt-3 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs font-bold text-navy transition hover:border-brand-blue hover:bg-brand-blue-soft hover:text-brand-blue riscos-relatorio-print-hide"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Ocultar análise" : "Ver análise"}
        </button>
      </div>

      <div
        className={`space-y-3 border-t border-[#eef2f7] bg-[#fbfcfe] px-4 py-4 riscos-relatorio-print-force ${
          open ? "" : "hidden"
        }`}
      >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              O que esta categoria avalia
            </p>
            <p className="mt-1 text-xs leading-relaxed text-navy">
              {analise.oQueAvalia}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Resultado encontrado
            </p>
            <p className="mt-1 text-xs leading-relaxed text-navy">
              {analise.resultadoEncontrado}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Possíveis impactos
            </p>
            <p className="mt-1 text-xs leading-relaxed text-navy">
              {analise.possiveisImpactos}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              Recomendações
            </p>
            <ul className="mt-1 space-y-1 text-xs leading-relaxed text-navy">
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
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Detalhamento
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
          Categorias COPSOQ
        </h3>
        <p className="mt-1 text-xs text-app-muted sm:text-sm">
          Cada categoria apresenta a pontuação média obtida pelos participantes,
          respeitando a escala original do instrumento (0–3 ou 0–4). A
          classificação considera a metodologia adotada pelo sistema para cada
          categoria.
        </p>
      </div>
      <div className="relatorio-dimensoes-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((d) => (
          <DimensaoCard key={d.id} d={d} />
        ))}
      </div>
    </section>
  );
}
