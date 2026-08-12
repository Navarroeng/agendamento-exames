"use client";

import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { gerarConteudoExecutivo } from "@/lib/riscos-relatorio-conteudo";

export function RelatorioConclusoesExecutivas({
  relatorio,
}: {
  relatorio: RiscosRelatorioRecord;
}) {
  const { conclusaoTecnica, recomendacoesGerais } =
    gerarConteudoExecutivo(relatorio);

  return (
    <section className="space-y-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Síntese técnica
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
          Conclusão e recomendações
        </h3>
        <p className="mt-1 text-xs text-app-muted sm:text-sm">
          Textos gerados automaticamente a partir do snapshot persistido desta
          campanha — específicos para os resultados encontrados.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#e8edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h4 className="text-sm font-extrabold text-navy">Conclusão Técnica</h4>
          <div className="mt-3 space-y-3 text-xs leading-relaxed text-navy sm:text-sm">
            {conclusaoTecnica.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#e8edf5] bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h4 className="text-sm font-extrabold text-navy">
            Recomendações Gerais
          </h4>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-navy sm:text-sm">
            {recomendacoesGerais.map((r) => (
              <li key={r.slice(0, 48)} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
