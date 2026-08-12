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

function descricaoCurta(id: string, max = 72): string {
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
      className="riscos-relatorio-print-card flex h-full flex-col rounded-xl border bg-white p-3"
      style={{
        borderColor: `${cor}55`,
        borderTopWidth: 3,
        borderTopColor: cor,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: bg, color: cor }}
          aria-hidden
        >
          <Icon size={18} strokeWidth={1.85} />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-[12px] font-extrabold leading-snug text-navy">
            {d.nome}
          </h4>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {String(d.tipo).toUpperCase() === "RISCO" ? "RISCO" : "PROTEÇÃO"}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <p className="text-lg font-extrabold tabular-nums tracking-tight text-navy">
          {pontuacao}
        </p>
        <span
          className="inline-flex rounded-full px-2 py-0.5 text-[9px] font-extrabold leading-tight text-white"
          style={{ backgroundColor: cor }}
        >
          {d.classificacaoLabel}
        </span>
      </div>

      <p className="mt-2 text-[10px] leading-snug text-[#64748b]">{descricao}</p>
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
      <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-8 text-center text-sm text-app-muted">
        Sem categorias quantitativas suficientes para o panorama.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Resultado geral
          </p>
          <h3 className="mt-1 text-base font-extrabold text-navy sm:text-lg">
            Panorama das Categorias
          </h3>
          <p className="mt-0.5 max-w-2xl text-xs text-app-muted">
            Visão executiva das categorias avaliadas, com pontuação e
            classificação.
          </p>
        </div>
        <RelatorioLegendaCores />
      </div>

      <div className="relatorio-panorama-grid grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {itens.map((d) => (
          <CategoriaPanoramaCard key={d.id} d={d} />
        ))}
      </div>
    </section>
  );
}
