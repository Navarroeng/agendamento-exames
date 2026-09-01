"use client";

import {
  indicadoresComplementaresDeRelatorio,
  type IndicadorComplementarApresentacao,
  type IndicadoresComplementaresApresentacao,
  type StatusIndicadorComplementar,
} from "@/lib/riscos-indicadores-complementares";
import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";

function badgeClasses(status: StatusIndicadorComplementar): {
  wrap: string;
  text: string;
} {
  if (status === "requer_atencao") {
    return {
      wrap: "border-[#fde68a] bg-[#fefce8]",
      text: "text-[#92400e]",
    };
  }
  if (status === "sem_dados") {
    return {
      wrap: "border-[#e2e8f0] bg-[#f8fafc]",
      text: "text-[#64748b]",
    };
  }
  return {
    wrap: "border-[#bbf7d0] bg-[#f0fdf4]",
    text: "text-[#166534]",
  };
}

function CardIndicador({ item }: { item: IndicadorComplementarApresentacao }) {
  const badge = badgeClasses(item.status);
  return (
    <article
      className="relatorio-indicador-card riscos-relatorio-print-card rounded-xl border border-[#e8edf5] bg-white px-3.5 py-3"
      data-relatorio-item={item.id}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="min-w-0 flex-1 text-[12px] font-extrabold uppercase leading-snug tracking-wide text-navy">
          {item.tema}
        </h4>
        <span
          className={`relatorio-indicador-badge shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold leading-none ${badge.wrap} ${badge.text}`}
        >
          {item.labelStatus}
        </span>
      </div>
      <p className="relatorio-indicador-texto mt-2 text-[11px] leading-relaxed text-navy">
        {item.textoPrincipal}
      </p>
      {item.textoRecomendacao ? (
        <p className="relatorio-indicador-recomendacao mt-2 text-[11px] leading-relaxed text-app-muted">
          {item.textoRecomendacao}
        </p>
      ) : null}
      {item.textoAvisoConfidencialidade ? (
        <p className="relatorio-indicador-aviso mt-2 text-[10px] leading-relaxed text-[#64748b]">
          {item.textoAvisoConfidencialidade}
        </p>
      ) : null}
    </article>
  );
}

function SinteseIndicadores({
  sintese,
}: {
  sintese: NonNullable<IndicadoresComplementaresApresentacao["sintese"]>;
}) {
  return (
    <aside
      className="relatorio-indicadores-sintese riscos-relatorio-print-card mt-4 rounded-xl border border-[#e8edf5] bg-[#f8fafc] px-3.5 py-3"
      data-relatorio-item="sintese"
    >
      <h4 className="text-[11px] font-extrabold uppercase tracking-wide text-navy">
        {sintese.titulo}
      </h4>
      <p className="mt-2 text-[11px] leading-relaxed text-navy">
        {sintese.textoIntro}
      </p>
      <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-[#64748b]">
        {sintese.rotuloTemas}
      </p>
      <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-navy">
        {sintese.temas.map((tema) => (
          <li key={tema}>• {tema}</li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * Indicadores complementares — Comportamentos Ofensivos (fora das 10 categorias COPSOQ).
 */
export function RelatorioIndicadoresComplementares({
  relatorio,
  itemIds,
  mostrarCabecalho = true,
  mostrarSintese = true,
}: {
  relatorio: RiscosRelatorioRecord;
  itemIds?: readonly string[];
  mostrarCabecalho?: boolean;
  mostrarSintese?: boolean;
}) {
  const dados = indicadoresComplementaresDeRelatorio(relatorio);
  const ids = itemIds ? new Set(itemIds) : null;

  const indicadores = ids
    ? dados.indicadores.filter((i) => ids.has(i.id))
    : dados.indicadores;

  const mostrarBlocoSintese =
    mostrarSintese &&
    dados.sintese &&
    (!ids || ids.has("sintese"));

  if (!dados.disponivel && mostrarCabecalho) {
    return (
      <section className="relatorio-indicadores-complementares">
        <header className="relatorio-indicadores-cabecalho mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
            Indicadores complementares
          </p>
          <h3 className="mt-2 text-base font-extrabold text-navy sm:text-lg">
            Comportamentos Ofensivos
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-app-muted">
            Indicadores avaliados separadamente das 10 categorias COPSOQ.
          </p>
        </header>
        <p className="text-[11px] leading-relaxed text-app-muted">
          Dados dos indicadores complementares indisponíveis neste relatório.
        </p>
      </section>
    );
  }

  if (indicadores.length === 0 && !mostrarBlocoSintese && !mostrarCabecalho) {
    return null;
  }

  return (
    <section className="relatorio-indicadores-complementares">
      {mostrarCabecalho ? (
        <header className="relatorio-indicadores-cabecalho mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
            Indicadores complementares
          </p>
          <h3 className="mt-2 text-base font-extrabold text-navy sm:text-lg">
            Comportamentos Ofensivos
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-app-muted">
            Indicadores avaliados separadamente das 10 categorias COPSOQ.
          </p>
        </header>
      ) : null}

      {indicadores.length > 0 ? (
        <div className="relatorio-indicadores-lista flex flex-col gap-3">
          {indicadores.map((item) => (
            <CardIndicador key={item.id} item={item} />
          ))}
        </div>
      ) : null}

      {mostrarBlocoSintese && dados.sintese ? (
        <SinteseIndicadores sintese={dados.sintese} />
      ) : null}
    </section>
  );
}
