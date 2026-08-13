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
  responsavel: "Pedro Navarro - CREA 5069206790/SP",
} as const;

const CAPA_NAVY = "#0b1f4d";
const CAPA_GOLD = "#c9972b";
const CAPA_NAVY_SOFT = "#e8eef8";
const CAPA_NAVY_BORDER = "#c5d0e4";

function IndicadorCapa({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-[3.1rem] flex-col items-center justify-center rounded-lg border bg-white px-2 py-2 text-center"
      style={{
        borderColor: CAPA_NAVY_BORDER,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <span
        className="absolute inset-x-4 top-0 h-[2px] rounded-b-full"
        style={{ backgroundColor: CAPA_GOLD }}
        aria-hidden
      />
      <p
        className="text-[8px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "#5a6a86" }}
      >
        {label}
      </p>
      <p
        className="mt-1 text-[1.05rem] font-extrabold tabular-nums leading-none tracking-tight"
        style={{ color: CAPA_NAVY }}
      >
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
  const iniciais = iniciaisEmpresa(empresa);

  return (
    <section
      className="relatorio-capa-folha relative flex h-full flex-col overflow-hidden"
      style={{
        backgroundColor: "#ffffff",
        color: CAPA_NAVY,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Faixa institucional — ~30% da folha, único bloco de tinta pesada */}
      <div
        className="relative shrink-0 px-8 pb-7 pt-6 text-white"
        style={{
          backgroundColor: CAPA_NAVY,
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        <header className="flex items-start justify-between gap-4">
          <div className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NAVARRO_INSTITUCIONAL.logoSrc}
              alt="Logo Navarro Engenharia"
              className="h-[3.75rem] w-auto max-w-[10.5rem] rounded-lg border border-white/20 bg-white object-contain p-1.5"
            />
          </div>
          <div className="min-w-0 max-w-[62%] text-right">
            <p className="text-[11px] font-semibold leading-snug text-white">
              {NAVARRO_INSTITUCIONAL.nome}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-[#b8c5dc]">
              CNPJ: {NAVARRO_INSTITUCIONAL.cnpj}
            </p>
            <p className="whitespace-nowrap text-[9px] leading-relaxed text-[#b8c5dc]">
              Responsável: {NAVARRO_INSTITUCIONAL.responsavel}
            </p>
            <p className="text-[10px] leading-relaxed text-[#b8c5dc]">
              Emissão: {data} às {hora}
            </p>
          </div>
        </header>

        <div className="mt-4" aria-hidden>
          <div className="h-px w-full bg-white/20" />
          <div
            className="mx-auto -mt-px h-[2px] w-16"
            style={{ backgroundColor: CAPA_GOLD }}
          />
        </div>

        <div className="mt-5 text-center">
          <p
            className="text-[11px] font-bold uppercase text-[#e8d29e]"
            style={{ letterSpacing: "0.28em" }}
          >
            Documento Técnico
          </p>
          <h2 className="mt-3 text-[1.55rem] font-extrabold leading-[1.12] tracking-tight text-white sm:text-[1.75rem]">
            Relatório de Avaliação
            <br />
            dos Riscos Psicossociais
          </h2>
          <p className="mt-2.5 text-[13px] font-medium text-[#c5d0e6]">
            Instrumento COPSOQ II-Br
          </p>
        </div>

        {/* Transição: linha + detalhe dourado — imprime como cor sólida */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0" aria-hidden>
          <div className="h-[2px] w-full" style={{ backgroundColor: CAPA_GOLD }} />
        </div>
      </div>
      <div className="flex shrink-0 justify-center" aria-hidden>
        <div
          className="-mt-px h-[3px] w-[18mm]"
          style={{ backgroundColor: CAPA_GOLD }}
        />
      </div>

      {/* Área branca — identificação do cliente + indicadores */}
      <div className="flex min-h-0 flex-1 flex-col px-8 pb-8 pt-5">
        {/*
         * Grupo inteiro desce 80px (padding-top no container).
         * Vãos internos em px fixos — o flex:1 abaixo segura os indicadores na base.
         */}
        <div className="relatorio-capa-empresa">
          <p className="relatorio-capa-empresa-rotulo">Empresa avaliada</p>

          <div className="relatorio-capa-empresa-logo">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${empresa}`}
                className="h-[7.5rem] w-auto max-w-[16rem] rounded-xl border border-[#e8edf5] bg-[#f8fafc] object-contain p-3 shadow-[0_1px_10px_rgba(15,23,42,0.05)]"
              />
            ) : (
              <div
                className="flex h-[7.5rem] w-[7.5rem] items-center justify-center rounded-xl border text-2xl font-extrabold tracking-wide"
                style={{
                  borderColor: CAPA_NAVY_BORDER,
                  backgroundColor: CAPA_NAVY_SOFT,
                  color: CAPA_NAVY,
                  WebkitPrintColorAdjust: "exact",
                  printColorAdjust: "exact",
                }}
              >
                {iniciais}
              </div>
            )}
          </div>

          <p className="relatorio-capa-empresa-nome">{empresa}</p>

          <div className="relatorio-capa-empresa-traco" aria-hidden />

          <div className="relatorio-capa-empresa-dados mx-auto grid grid-cols-3 gap-x-4">
            <div className="min-w-0 text-center">
              <p className="relatorio-capa-empresa-dado-label">CNPJ</p>
              <p className="relatorio-capa-empresa-dado-valor">{cnpjCliente}</p>
            </div>
            <div className="min-w-0 text-center">
              <p className="relatorio-capa-empresa-dado-label">Campanha</p>
              <p className="relatorio-capa-empresa-dado-valor">{codigo}</p>
            </div>
            <div className="min-w-0 text-center">
              <p className="relatorio-capa-empresa-dado-label">Período avaliado</p>
              <p className="relatorio-capa-empresa-dado-valor">{periodo || "—"}</p>
            </div>
          </div>
        </div>

        {/* Branco restante — empurra os indicadores para a base, sem comprimir os gaps acima */}
        <div className="min-h-[12mm] flex-1" aria-hidden />

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

        {/* Respiro inferior da capa — indicadores permanecem na base */}
        <div className="min-h-[8mm] shrink-0" aria-hidden />
      </div>

      <div className="relatorio-capa-print-mask hidden" aria-hidden />
    </section>
  );
}
