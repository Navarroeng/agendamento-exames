"use client";

import {
  formatLocalEmissaoSaoPauloExtenso,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import { gerarConteudoExecutivo } from "@/lib/riscos-relatorio-conteudo";

const ASSINATURA_SRC = "/assinaturas/pedro-henrique-navarro.png";

/**
 * Última página: Síntese Técnica + assinatura técnica (mesmo DOM modal/PDF).
 * Cards em coluna única (largura total) — assinatura na mesma folha.
 */
export function RelatorioConclusoesExecutivas({
  relatorio,
}: {
  relatorio: RiscosRelatorioRecord;
}) {
  const { conclusaoTecnica, recomendacoesGerais } =
    gerarConteudoExecutivo(relatorio);
  const dataEmissaoExtenso = formatLocalEmissaoSaoPauloExtenso(
    relatorio.gerado_em
  );

  return (
    <section className="relatorio-sintese-tecnica">
      <header className="relatorio-sintese-header mb-2.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Síntese técnica
        </p>
        <h3 className="mt-1 text-base font-extrabold text-navy sm:text-lg">
          Conclusão e recomendações
        </h3>
        <p className="mt-1 text-[11px] leading-snug text-app-muted">
          Análises elaboradas a partir dos resultados consolidados desta
          campanha, considerando especificamente os resultados encontrados.
        </p>
      </header>

      <div className="relatorio-sintese-cards flex flex-col gap-[5mm]">
        <div className="riscos-relatorio-print-card relatorio-sintese-card rounded-xl border border-[#e8edf5] bg-white px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h4 className="text-[13px] font-extrabold text-navy">
            Conclusão Técnica
          </h4>
          <div className="relatorio-sintese-card-body mt-1.5 space-y-1 text-[11px] leading-snug text-navy">
            {conclusaoTecnica.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </div>
        </div>

        <div className="riscos-relatorio-print-card relatorio-sintese-card rounded-xl border border-[#e8edf5] bg-white px-3.5 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <h4 className="text-[13px] font-extrabold text-navy">
            Recomendações Gerais
          </h4>
          <ul className="relatorio-sintese-card-body mt-1.5 space-y-0.5 text-[11px] leading-snug text-navy">
            {recomendacoesGerais.map((r) => (
              <li key={r.slice(0, 48)} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-blue" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Empurrado ao rodapé da última folha (flex); data = gerado_em persistido */}
      <div className="relatorio-assinatura-tecnica flex flex-col items-center text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-navy">
          {dataEmissaoExtenso}
        </p>

        <div className="relatorio-assinatura-imagem-wrap mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSINATURA_SRC}
            alt="Assinatura Pedro Henrique Navarro"
            className="relatorio-assinatura-imagem"
          />
        </div>

        <div className="mt-1.5 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-navy">
            Eng. Mecânico e Segurança do Trabalho
          </p>
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-navy">
            Pedro Henrique Navarro
          </p>
          <p className="text-[10px] font-semibold tracking-wide text-[#475569]">
            CREA 5069206790/SP
          </p>
        </div>
      </div>
    </section>
  );
}
