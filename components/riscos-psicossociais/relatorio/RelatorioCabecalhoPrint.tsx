"use client";

/**
 * Cabeçalho azul compacto — início do conteúdo do relatório no PDF (página 2+).
 * Não aparece no modal.
 */

import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";

export function RelatorioCabecalhoPrint({
  relatorio,
}: {
  relatorio: RiscosRelatorioRecord;
}) {
  const codigo =
    relatorio.resultado_json?.capa?.codigoPublico ||
    relatorio.codigo_publico ||
    "";

  return (
    <section className="riscos-relatorio-print-cabecalho border border-[#dbe4f3] bg-white text-[#0b1f4d]">
      <div className="flex items-center justify-between gap-4 border-b-2 border-[#0b1f4d] bg-[#0b1f4d] px-3 py-2.5 text-white">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#e8d29e]">
            Relatório executivo · COPSOQ II-Br
            {codigo ? ` · ${codigo}` : ""}
          </p>
          <h2 className="mt-0.5 text-sm font-extrabold leading-tight tracking-tight">
            Avaliação dos Riscos Psicossociais
          </h2>
        </div>
        <p className="text-[9px] font-semibold text-white/70">
          Documento consolidado e anônimo
        </p>
      </div>
    </section>
  );
}
