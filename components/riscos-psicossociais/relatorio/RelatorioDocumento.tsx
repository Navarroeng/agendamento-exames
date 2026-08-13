"use client";

import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { RelatorioCapa } from "@/components/riscos-psicossociais/relatorio/RelatorioCapa";
import { RelatorioResumoExecutivo } from "@/components/riscos-psicossociais/relatorio/RelatorioResumoExecutivo";
import { RelatorioPanoramaCategorias } from "@/components/riscos-psicossociais/relatorio/RelatorioPanoramaCategorias";
import { RelatorioBarrasChart } from "@/components/riscos-psicossociais/relatorio/RelatorioBarrasChart";
import { RelatorioRanking } from "@/components/riscos-psicossociais/relatorio/RelatorioRanking";
import { RelatorioDimensoesCards } from "@/components/riscos-psicossociais/relatorio/RelatorioDimensoesCards";
import { RelatorioConclusoesExecutivas } from "@/components/riscos-psicossociais/relatorio/RelatorioConclusoesExecutivas";
import { relatorioTemNormalizacao } from "@/lib/riscos-relatorio-view";

/**
 * Fonte da verdade do Relatório Executivo.
 * Renderizado uma vez na folha A4 — modal e PDF usam o mesmo DOM.
 */
export function RelatorioDocumento({
  relatorio,
  logoUrl,
  empresaCnpj,
  campanhaStatus,
}: {
  relatorio: RiscosRelatorioRecord;
  logoUrl?: string | null;
  empresaCnpj?: string | null;
  campanhaStatus?: string | null;
}) {
  const dimensoes = relatorio.resultado_json?.dimensoes ?? [];
  const normalizado = relatorioTemNormalizacao(dimensoes);

  return (
    <div className="relatorio-documento">
      {/* Página 1 — capa (página própria) */}
      <section className="relatorio-a4-capa">
        <RelatorioCapa
          relatorio={relatorio}
          logoUrl={logoUrl}
          empresaCnpj={empresaCnpj}
          campanhaStatus={campanhaStatus}
        />
      </section>

      {/* Páginas internas — Visão Executiva (p.2) e demais seções */}
      <div className="relatorio-a4-conteudo">
        {!normalizado ? (
          <div className="riscos-relatorio-print-card mb-5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2.5 text-sm text-[#92400e]">
            <p className="font-extrabold text-xs">
              Snapshot anterior à metodologia atual de escalas
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Este relatório foi gerado antes da metodologia de classificação
              do sistema (escalas impressas 0–3 / 0–4). Para aplicar a
              metodologia atual, use <strong>Regenerar</strong>.
            </p>
          </div>
        ) : null}

        {/* Página 2 — somente Visão Executiva */}
        <section className="relatorio-secao-visao-executiva">
          <RelatorioResumoExecutivo relatorio={relatorio} />
        </section>

        {/* Página 3+ — Panorama inicia no topo (quebra obrigatória no print) */}
        <section className="relatorio-secao-panorama mt-8 print:mt-0">
          <RelatorioPanoramaCategorias dimensoes={dimensoes} />
        </section>

        <section className="mt-5">
          <RelatorioBarrasChart dimensoes={dimensoes} />
        </section>

        <section className="mt-5">
          <RelatorioRanking dimensoes={dimensoes} />
        </section>

        <section className="mt-5">
          <RelatorioDimensoesCards dimensoes={dimensoes} />
        </section>

        <section className="mt-5">
          <RelatorioConclusoesExecutivas relatorio={relatorio} />
        </section>
      </div>

      {/* Rodapé fixo nas páginas internas (print) — capa sem número */}
      <div
        className="relatorio-print-footer-interno"
        aria-hidden
      >
        <div className="relatorio-print-footer-inner">
          <span>
            Navarro Engenharia de Segurança e Medicina Ocupacional
          </span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>Relatório de Avaliação dos Riscos Psicossociais</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span className="relatorio-print-page-num" />
        </div>
      </div>
    </div>
  );
}
