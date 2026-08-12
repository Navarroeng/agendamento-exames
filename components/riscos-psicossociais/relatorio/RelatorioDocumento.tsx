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
      {/* Página 1 — capa */}
      <section className="relatorio-a4-pagina relatorio-a4-capa">
        <RelatorioCapa
          relatorio={relatorio}
          logoUrl={logoUrl}
          empresaCnpj={empresaCnpj}
          campanhaStatus={campanhaStatus}
        />
      </section>

      {/* Conteúdo contínuo (quebras naturais; Fase 2 refinará) */}
      <div className="relatorio-a4-conteudo space-y-8 pt-2">
        {!normalizado ? (
          <div className="riscos-relatorio-print-card rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm text-[#92400e]">
            <p className="font-extrabold">
              Snapshot anterior à metodologia atual de escalas
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Este relatório foi gerado antes da metodologia de classificação
              do sistema (escalas impressas 0–3 / 0–4). Médias e classificações
              exibidas são as do momento da geração. Para aplicar a metodologia
              atual, um administrador deve usar <strong>Regenerar</strong>.
            </p>
          </div>
        ) : null}

        <section className="riscos-relatorio-print-section">
          <RelatorioResumoExecutivo relatorio={relatorio} />
        </section>

        <section className="riscos-relatorio-print-section">
          <RelatorioPanoramaCategorias dimensoes={dimensoes} />
        </section>

        <section className="riscos-relatorio-print-section riscos-relatorio-print-chart">
          <RelatorioBarrasChart dimensoes={dimensoes} />
        </section>

        <section className="riscos-relatorio-print-section">
          <RelatorioRanking dimensoes={dimensoes} />
        </section>

        <section className="riscos-relatorio-print-section">
          <RelatorioDimensoesCards dimensoes={dimensoes} />
        </section>

        <section className="riscos-relatorio-print-section">
          <RelatorioConclusoesExecutivas relatorio={relatorio} />
        </section>

        <footer className="relatorio-a4-rodape border-t border-[#e2e8f0] pt-3 text-center text-[9px] text-[#64748b]">
          Navarro Engenharia · Relatório de Riscos Psicossociais
          {relatorio.codigo_publico
            ? ` · ${relatorio.codigo_publico}`
            : ""}{" "}
          · Gerado em{" "}
          {relatorio.gerado_em
            ? new Date(relatorio.gerado_em).toLocaleString("pt-BR")
            : "—"}
        </footer>
      </div>
    </div>
  );
}
