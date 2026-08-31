"use client";

import type { RiscosRelatorioRecord } from "@/lib/riscos-relatorio";
import { RelatorioCapa } from "@/components/riscos-psicossociais/relatorio/RelatorioCapa";
import { RelatorioResumoExecutivo } from "@/components/riscos-psicossociais/relatorio/RelatorioResumoExecutivo";
import { RelatorioPanoramaCategorias } from "@/components/riscos-psicossociais/relatorio/RelatorioPanoramaCategorias";
import { RelatorioBarrasChart } from "@/components/riscos-psicossociais/relatorio/RelatorioBarrasChart";
import { RelatorioRanking } from "@/components/riscos-psicossociais/relatorio/RelatorioRanking";
import { RelatorioDimensoesCards } from "@/components/riscos-psicossociais/relatorio/RelatorioDimensoesCards";
import { RelatorioIndicadoresComplementares } from "@/components/riscos-psicossociais/relatorio/RelatorioIndicadoresComplementares";
import { RelatorioConclusoesExecutivas } from "@/components/riscos-psicossociais/relatorio/RelatorioConclusoesExecutivas";
import { RelatorioCabecalhoInterno } from "@/components/riscos-psicossociais/relatorio/RelatorioCabecalhoInterno";
import { RelatorioPaginacaoViewer } from "@/components/riscos-psicossociais/relatorio/RelatorioPaginacaoViewer";
import { relatorioTemNormalizacao } from "@/lib/riscos-relatorio-view";

/**
 * Fonte da verdade do Relatório Executivo.
 * Renderizado uma vez na folha A4 — modal e PDF usam o mesmo DOM.
 *
 * Cabeçalho institucional: apenas páginas internas (nunca na capa).
 * Colocado no início de cada seção que inicia folha — sem position:fixed
 * (fixed cobria a capa no Chromium).
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
  const empresaNome =
    relatorio.resultado_json?.capa?.empresaNome ||
    relatorio.empresa_nome ||
    "Empresa";

  const cabecalho = (
    <RelatorioCabecalhoInterno logoUrl={logoUrl} empresaNome={empresaNome} />
  );

  return (
    <div className="relatorio-documento">
      {/* Página 1 — capa exclusiva (sem cabeçalho interno) */}
      <section className="relatorio-a4-capa">
        <RelatorioCapa
          relatorio={relatorio}
          logoUrl={logoUrl}
          empresaCnpj={empresaCnpj}
          campanhaStatus={campanhaStatus}
        />
      </section>

      {/* Páginas internas — cada seção de folha inicia com o cabeçalho */}
      <div className="relatorio-a4-conteudo">
        {/* Página 2 — Visão Executiva */}
        <section className="relatorio-secao-visao-executiva">
          {cabecalho}
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
          <RelatorioResumoExecutivo relatorio={relatorio} />
        </section>

        <section className="relatorio-secao-panorama mt-8 print:mt-0">
          {cabecalho}
          <RelatorioPanoramaCategorias dimensoes={dimensoes} />
        </section>

        <section className="relatorio-secao-graficos mt-8 print:mt-0">
          {cabecalho}
          <RelatorioBarrasChart dimensoes={dimensoes} />
        </section>

        <section className="relatorio-secao-ranking mt-8 print:mt-0">
          {cabecalho}
          <RelatorioRanking dimensoes={dimensoes} />
        </section>

        {/*
          Detalhamento: cabeçalho no thead (repete em cada folha no print).
          Assim qualquer card que inicie página herda área segura superior.
        */}
        <section className="relatorio-secao-detalhamento mt-8 print:mt-0">
          <RelatorioDimensoesCards dimensoes={dimensoes} cabecalho={cabecalho} />
        </section>

        <section className="relatorio-secao-indicadores-complementares mt-8 print:mt-0">
          {cabecalho}
          <RelatorioIndicadoresComplementares relatorio={relatorio} />
        </section>

        {/* Última seção — página exclusiva */}
        <section className="relatorio-secao-conclusoes mt-8 print:mt-0">
          {cabecalho}
          <RelatorioConclusoesExecutivas relatorio={relatorio} />
        </section>
      </div>

      {/* Rodapé DOM legado — oculto; PDF usa @page; viewer usa RelatorioPaginacaoViewer */}
      <div className="relatorio-print-footer-interno" aria-hidden>
        <div className="relatorio-print-footer-inner">
          <span>
            Navarro Engenharia de Segurança e Medicina Ocupacional
          </span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>Relatório de Avaliação dos Riscos Psicossociais</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>Versão 1.0</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span>Confidencial</span>
          <span className="relatorio-print-footer-sep">·</span>
          <span className="relatorio-print-page-num" />
        </div>
      </div>

      <RelatorioPaginacaoViewer />
    </div>
  );
}
