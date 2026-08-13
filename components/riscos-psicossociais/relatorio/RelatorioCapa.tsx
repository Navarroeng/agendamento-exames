"use client";

import type { ReactNode } from "react";
import {
  formatDataHoraRelatorio,
  formatTaxaParticipacao,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";
import { formatCNPJ } from "@/lib/cnpj";
import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";
import { iniciaisEmpresa } from "@/lib/riscos-relatorio-view";

const NAVARRO_INSTITUCIONAL = {
  nome: "Navarro Engenharia de Segurança e Medicina Ocupacional",
  cnpj: NAVARRO_DADOS_BANCARIOS.pixCnpj,
  logoSrc: "/logo-navarro.png",
} as const;

/** Fundo sólido no elemento raiz da capa — estável no PDF (sem gradient/blur). */
const CAPA_BG = "#0b1f4d";
const CAPA_PANEL = "#132a5c";
const CAPA_GOLD = "#c9972b";
const CAPA_LINE = "#2a4578";

function IndicadorCapa({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className="flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border px-2 py-2 text-center"
      style={{
        borderColor: CAPA_LINE,
        backgroundColor: CAPA_PANEL,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#9eb0d0]">
        {label}
      </p>
      <p className="mt-1 text-[1.05rem] font-extrabold tabular-nums leading-none tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

export function RelatorioCapa({
  relatorio,
  logoUrl,
  empresaCnpj,
}: {
  relatorio: RiscosRelatorioRecord;
  logoUrl?: string | null;
  empresaCnpj?: string | null;
  campanhaStatus?: string | null;
}) {
  const json = relatorio.resultado_json;
  const capa = json?.capa;
  const resumo = json?.resumoExecutivo;
  const empresa = capa?.empresaNome || relatorio.empresa_nome;
  const { data, hora } = formatDataHoraRelatorio(relatorio.gerado_em);
  const periodo = formatPeriodoCampanha(
    capa?.dataInicio || "",
    capa?.dataEncerramento || ""
  );
  const cnpjCliente = formatCNPJ(empresaCnpj);
  const codigo = capa?.codigoPublico || relatorio.codigo_publico || "—";
  const responsavel = relatorio.gerado_por?.trim() || "—";
  const iniciais = iniciaisEmpresa(empresa);

  return (
    <section
      className="relatorio-capa-folha relative flex h-full flex-col text-white"
      style={{
        backgroundColor: CAPA_BG,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/*
        Distribuição vertical equilibrada na folha A4 (297mm).
        Spacers flex-1 espalham o conteúdo — sem scale(), sem overflow.
      */}
      <div className="flex min-h-0 flex-1 flex-col px-6 py-5 sm:px-8 sm:py-6">
        {/* 1. Cabeçalho — somente Navarro */}
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NAVARRO_INSTITUCIONAL.logoSrc}
              alt="Logo Navarro Engenharia"
              className="h-[4.25rem] w-auto max-w-[11rem] rounded-lg border border-white/20 bg-white object-contain p-2"
            />
          </div>
          <div className="min-w-0 max-w-[58%] text-right">
            <p className="text-[11px] font-semibold leading-snug text-white">
              {NAVARRO_INSTITUCIONAL.nome}
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#b8c5dc]">
              CNPJ: {NAVARRO_INSTITUCIONAL.cnpj}
            </p>
            <p className="text-[10px] leading-relaxed text-[#b8c5dc]">
              Responsável: {responsavel}
            </p>
            <p className="text-[10px] leading-relaxed text-[#b8c5dc]">
              Emissão: {data} às {hora}
            </p>
          </div>
        </header>

        {/* 2. Linha divisória com detalhe dourado */}
        <div className="mt-4 shrink-0" aria-hidden>
          <div className="h-px w-full" style={{ backgroundColor: CAPA_LINE }} />
          <div
            className="mx-auto -mt-px h-[2px] w-16"
            style={{ backgroundColor: CAPA_GOLD }}
          />
        </div>

        <div className="min-h-[0.75rem] flex-1" aria-hidden />

        {/* 3. Bloco principal do documento */}
        <div className="shrink-0 text-center">
          <p
            className="text-[11px] font-bold uppercase text-[#e8d29e]"
            style={{ letterSpacing: "0.28em" }}
          >
            Documento Técnico
          </p>
          <h2 className="mt-5 text-[1.65rem] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[1.85rem]">
            Relatório de Avaliação
            <br />
            dos Riscos Psicossociais
          </h2>
          <p className="mt-3 text-[13px] font-medium text-[#c5d0e6]">
            Instrumento COPSOQ II-Br
          </p>
          <div
            className="mx-auto mt-4 h-[2px] w-12"
            style={{ backgroundColor: CAPA_GOLD }}
            aria-hidden
          />
        </div>

        {/* Empurra menos — sobe o bloco Empresa Avaliada como unidade */}
        <div className="min-h-[0.35rem] flex-[0.45]" aria-hidden />

        {/* 4. Empresa avaliada — identificação institucional */}
        <div className="shrink-0 text-center">
          <p
            className="text-[9px] font-bold uppercase text-[#e8d29e]"
            style={{ letterSpacing: "0.2em" }}
          >
            Empresa avaliada
          </p>

          <div className="mt-4 flex justify-center">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${empresa}`}
                className="h-[6.5rem] w-auto max-w-[14rem] rounded-xl border border-white/25 bg-white object-contain p-3"
              />
            ) : (
              <div
                className="flex h-[6.5rem] w-[6.5rem] items-center justify-center rounded-xl border border-white/25 text-2xl font-extrabold tracking-wide text-white"
                style={{
                  backgroundColor: CAPA_PANEL,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                {iniciais}
              </div>
            )}
          </div>

          <p className="mx-auto mt-4 max-w-xl text-[1.2rem] font-extrabold leading-snug tracking-tight text-white">
            {empresa}
          </p>

          <div
            className="mx-auto mt-3 h-[2px] w-10"
            style={{ backgroundColor: CAPA_GOLD }}
            aria-hidden
          />

          <div className="mx-auto mt-6 grid max-w-xl grid-cols-3 gap-x-4">
            <div className="min-w-0 text-center">
              <p
                className="text-[9px] font-bold uppercase text-white/65"
                style={{ letterSpacing: "0.16em" }}
              >
                CNPJ
              </p>
              <p className="mt-1.5 text-[13px] font-semibold leading-snug text-white">
                {cnpjCliente}
              </p>
            </div>
            <div className="min-w-0 text-center">
              <p
                className="text-[9px] font-bold uppercase text-white/65"
                style={{ letterSpacing: "0.16em" }}
              >
                Campanha
              </p>
              <p className="mt-1.5 text-[13px] font-semibold leading-snug text-white">
                {codigo}
              </p>
            </div>
            <div className="min-w-0 text-center">
              <p
                className="text-[9px] font-bold uppercase text-white/65"
                style={{ letterSpacing: "0.16em" }}
              >
                Período avaliado
              </p>
              <p className="mt-1.5 text-[13px] font-semibold leading-snug text-white">
                {periodo || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Mais respiro abaixo — equilibra o bloco na região central */}
        <div className="min-h-[0.85rem] flex-[1.4]" aria-hidden />

        {/* 5. Indicadores — uma linha, mesma altura/largura */}
        <div className="grid shrink-0 grid-cols-4 gap-2">
          <IndicadorCapa
            label="Participantes"
            value={capa?.participantes ?? relatorio.participantes ?? 0}
          />
          <IndicadorCapa
            label="Respondentes"
            value={capa?.respondentes ?? relatorio.respondentes ?? 0}
          />
          <IndicadorCapa
            label="Participação"
            value={formatTaxaParticipacao(
              capa?.taxaParticipacao ?? relatorio.taxa_participacao
            )}
          />
          <IndicadorCapa
            label="Categorias"
            value={resumo?.quantidadeDimensoes ?? 0}
          />
        </div>

        <div className="min-h-[0.5rem] flex-1" aria-hidden />

        {/* 6. Rodapé institucional — dentro da página 1 */}
        <footer className="shrink-0 border-t pt-3" style={{ borderColor: CAPA_LINE }}>
          <p className="text-center text-[8.5px] font-medium leading-relaxed tracking-wide text-[#9eb0d0]">
            {NAVARRO_INSTITUCIONAL.nome}
            <span className="mx-1.5 text-[#5a7199]">•</span>
            Relatório de Avaliação dos Riscos Psicossociais
            <span className="mx-1.5 text-[#5a7199]">•</span>
            Versão 1.0
            <span className="mx-1.5 text-[#5a7199]">•</span>
            Confidencial
          </p>
        </footer>
      </div>

      {/* Máscara print: cobre rodapé fixo na página 1 */}
      <div className="relatorio-capa-print-mask hidden" aria-hidden />
    </section>
  );
}
