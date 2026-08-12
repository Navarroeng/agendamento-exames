"use client";

import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Briefcase,
  Building2,
  ClipboardList,
  Handshake,
  Heart,
  LayoutGrid,
  Rocket,
  Scale,
  Shield,
  Smile,
  Target,
} from "lucide-react";
import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import {
  bgSuavePorClassificacaoId,
  corPorClassificacaoId,
  descricaoOficialDimensao,
  dimensoesParaCalculo,
  formatPontuacaoComMaximo,
} from "@/lib/riscos-relatorio-view";
import { RelatorioLegendaCores } from "@/components/riscos-psicossociais/relatorio/RelatorioLegendaCores";

const ICONE_POR_CATEGORIA: Record<string, LucideIcon> = {
  "demandas-trabalho": ClipboardList,
  "influencia-desenvolvimento": Rocket,
  "significado-comprometimento": Target,
  "relacoes-interpessoais": Handshake,
  lideranca: Briefcase,
  "interface-trabalho-individuo": Smile,
  "conflitos-familia-trabalho": Scale,
  "valores-local-trabalho": Building2,
  "saude-geral": Heart,
  "burnout-estresse": Brain,
  "comportamentos-ofensivos": Shield,
};

function iconeCategoria(id: string): LucideIcon {
  return ICONE_POR_CATEGORIA[id] ?? LayoutGrid;
}

function descricaoCurta(id: string, max = 96): string {
  const texto = descricaoOficialDimensao(id).trim();
  if (texto.length <= max) return texto;
  return `${texto.slice(0, max - 1).trimEnd()}…`;
}

function CategoriaPanoramaCard({
  d,
}: {
  d: RiscosRelatorioDimensaoSnapshot;
}) {
  const cor = corPorClassificacaoId(d.classificacaoId);
  const bg = bgSuavePorClassificacaoId(d.classificacaoId);
  const Icon = iconeCategoria(d.id);
  const pontuacao = formatPontuacaoComMaximo(
    d.media,
    d.maxEscalaPadronizada ?? d.maxEscalaBruta ?? 4
  );
  const descricao = descricaoCurta(d.id);

  return (
    <article
      className="riscos-relatorio-print-card flex h-full flex-col rounded-2xl border bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      style={{ borderColor: `${cor}55`, borderTopWidth: 3, borderTopColor: cor }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: bg, color: cor }}
          aria-hidden
        >
          <Icon size={22} strokeWidth={1.85} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] font-extrabold leading-snug text-navy sm:text-sm">
            {d.nome}
          </h4>
          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {String(d.tipo).toUpperCase() === "RISCO" ? "RISCO" : "PROTEÇÃO"}
          </p>
        </div>
      </div>

      <p className="mt-4 text-2xl font-extrabold tabular-nums tracking-tight text-navy">
        {pontuacao}
      </p>

      <span
        className="mt-3 inline-flex w-fit max-w-full rounded-full px-2.5 py-1 text-[10px] font-extrabold leading-tight text-white"
        style={{ backgroundColor: cor }}
      >
        {d.classificacaoLabel}
      </span>

      <p className="mt-3 text-[11px] leading-relaxed text-[#64748b]">
        {descricao}
      </p>
    </article>
  );
}

export function RelatorioPanoramaCategorias({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const itens = dimensoesParaCalculo(dimensoes);

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-10 text-center text-sm text-app-muted">
        Sem categorias quantitativas suficientes para o panorama.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Resultado geral
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
            Panorama das Categorias
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-app-muted sm:text-sm">
            Visão executiva de todas as categorias avaliadas, com pontuação e
            classificação na metodologia do sistema.
          </p>
        </div>
        <RelatorioLegendaCores />
      </div>

      <div className="relatorio-panorama-grid grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {itens.map((d) => (
          <CategoriaPanoramaCard key={d.id} d={d} />
        ))}
      </div>
    </section>
  );
}
