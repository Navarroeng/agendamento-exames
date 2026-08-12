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

function DimensaoCard({ d }: { d: RiscosRelatorioDimensaoSnapshot }) {
  const [open, setOpen] = useState(false);
  const cor = corPorClassificacaoId(d.classificacaoId);
  const bg = bgSuavePorClassificacaoId(d.classificacaoId);
  const analise = analisarDimensao(d);
  const comNorm = snapshotTemNormalizacao(d);

  return (
    <article
      className="rounded-2xl border border-[#e8edf5] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_10px_28px_rgba(15,23,42,0.07)]"
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
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Pontuação original
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {formatPontuacaoComMaximo(d.mediaBruta, d.maxEscalaBruta)}
              </p>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: bg }}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Pontuação padronizada
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {formatPontuacaoComMaximo(d.media, d.maxEscalaPadronizada ?? 4)}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-app-muted">
                Usada na classificação
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: bg }}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Média
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {formatMediaRelatorio(d.media)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f8fafc] px-3 py-2">
              <p className="text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
                Respondentes
              </p>
              <p className="mt-0.5 text-base font-extrabold tabular-nums text-navy">
                {d.respondentesValidos}
              </p>
            </div>
          </div>
        )}

        {comNorm ? (
          <p className="mt-2 text-[11px] text-app-muted">
            Respondentes válidos:{" "}
            <span className="font-bold text-navy">{d.respondentesValidos}</span>
          </p>
        ) : null}

        <button
          type="button"
          className="mt-3 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-2 text-xs font-bold text-navy transition hover:border-brand-blue hover:bg-brand-blue-soft hover:text-brand-blue"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Ocultar análise" : "Ver análise"}
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-[#eef2f7] bg-[#fbfcfe] px-4 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
              O que esta dimensão avalia
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
      ) : null}
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
          Dimensões COPSOQ
        </h3>
        <p className="mt-1 text-xs text-app-muted sm:text-sm">
          Análise técnica por dimensão — interpretação automática a partir do
          snapshot persistido (sem recálculo). A classificação usa a pontuação
          padronizada (escala comum 0–4).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((d) => (
          <DimensaoCard key={d.id} d={d} />
        ))}
      </div>
    </section>
  );
}
