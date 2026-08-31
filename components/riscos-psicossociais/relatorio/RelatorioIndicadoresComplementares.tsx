"use client";

import {
  indicadoresComplementaresDeRelatorio,
  type IndicadorComplementarApresentacao,
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

function LinhaIndicador({ item }: { item: IndicadorComplementarApresentacao }) {
  const badge = badgeClasses(item.status);
  return (
    <li
      className="riscos-relatorio-print-card flex items-start justify-between gap-3 rounded-xl border border-[#e8edf5] bg-white px-3.5 py-2.5"
      data-relatorio-item={item.id}
    >
      <span className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-navy">
        {item.tema}
      </span>
      <span
        className={`relatorio-indicador-badge shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-bold leading-none ${badge.wrap} ${badge.text}`}
      >
        {item.labelStatus}
      </span>
    </li>
  );
}

/**
 * Indicadores complementares — Comportamentos Ofensivos (fora das 10 categorias COPSOQ).
 */
export function RelatorioIndicadoresComplementares({
  relatorio,
  itemIds,
  mostrarCabecalho = true,
  mostrarOrientacao = true,
}: {
  relatorio: RiscosRelatorioRecord;
  itemIds?: readonly string[];
  mostrarCabecalho?: boolean;
  mostrarOrientacao?: boolean;
}) {
  const dados = indicadoresComplementaresDeRelatorio(relatorio);
  const ids = itemIds ? new Set(itemIds) : null;

  const indicadores = ids
    ? dados.indicadores.filter((i) => ids.has(i.id))
    : dados.indicadores;

  const mostrarRodape =
    mostrarOrientacao &&
    dados.textoOrientacaoSecao &&
    (!ids || ids.has("orientacao"));

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

  if (indicadores.length === 0 && !mostrarRodape && !mostrarCabecalho) {
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
        <ul className="relatorio-indicadores-lista flex flex-col gap-2">
          {indicadores.map((item) => (
            <LinhaIndicador key={item.id} item={item} />
          ))}
        </ul>
      ) : null}

      {mostrarRodape ? (
        <p
          className="relatorio-indicadores-orientacao mt-3 text-[11px] leading-relaxed text-navy"
          data-relatorio-item="orientacao"
        >
          {dados.textoOrientacaoSecao}
        </p>
      ) : null}
    </section>
  );
}
