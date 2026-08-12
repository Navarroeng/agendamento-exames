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

/** Fundo sólido — estável em PDF (gradientes/blur caem no visualizador Chromium). */
const CAPA_BG = "#0b1f4d";

function LogoDestacado({
  src,
  alt,
  fallback,
  caption,
}: {
  src?: string | null;
  alt: string;
  fallback: string;
  caption: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-14 w-auto max-w-[9rem] rounded-xl border border-white/25 bg-white object-contain p-2"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/25 bg-[#132a5c] text-base font-extrabold tracking-wide text-white">
          {fallback}
        </div>
      )}
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#c5d0e6]">
        {caption}
      </p>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9eb0d0]">
        {label}
      </p>
      <p className="mt-0.5 text-[12px] font-semibold leading-snug text-white">
        {value}
      </p>
    </div>
  );
}

function IndicadorCapa({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-[#2a4578] px-3 py-2"
      style={{
        backgroundColor: "#132a5c",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#9eb0d0]">
        {label}
      </p>
      <p className="mt-0.5 text-base font-extrabold tabular-nums tracking-tight text-white">
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

  return (
    <section
      className="relatorio-capa-folha relative flex h-full flex-col text-white"
      style={{
        backgroundColor: CAPA_BG,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div className="flex flex-1 flex-col px-5 py-4 sm:px-7 sm:py-5">
        {/* Logos */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a4578] pb-3">
          <LogoDestacado
            src={logoUrl}
            alt={`Logo ${empresa}`}
            fallback={iniciaisEmpresa(empresa)}
            caption="Empresa avaliada"
          />
          <LogoDestacado
            src={NAVARRO_INSTITUCIONAL.logoSrc}
            alt="Logo Navarro Engenharia"
            fallback="NE"
            caption="Responsável técnico"
          />
        </div>

        {/* Título */}
        <div className="mx-auto mt-4 max-w-2xl text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e8d29e]">
            Documento Técnico
          </p>
          <h2 className="mt-1.5 text-[1.35rem] font-extrabold leading-[1.15] tracking-tight sm:text-[1.6rem]">
            Relatório de Avaliação
            <br />
            dos Riscos Psicossociais
          </h2>
          <p className="mt-1.5 text-sm font-semibold text-[#c5d0e6]">
            Instrumento COPSOQ II-Br
          </p>
          <div
            className="mx-auto mt-3 h-0.5 w-14"
            style={{ backgroundColor: "#c9972b" }}
            aria-hidden
          />
        </div>

        {/* Empresa + Responsável — compacto horizontal */}
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          <div
            className="rounded-xl border border-[#2a4578] p-3"
            style={{
              backgroundColor: "#132a5c",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#e8d29e]">
              Empresa avaliada
            </p>
            <p className="mt-1 text-[14px] font-extrabold leading-snug text-white">
              {empresa}
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
              <MetaItem label="CNPJ" value={cnpjCliente} />
              <MetaItem label="Campanha" value={codigo} />
              <MetaItem label="Período" value={periodo || "—"} />
            </div>
          </div>

          <div
            className="rounded-xl border border-[#2a4578] p-3"
            style={{
              backgroundColor: "#132a5c",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          >
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#e8d29e]">
              Responsável pela avaliação
            </p>
            <p className="mt-1 text-[12px] font-extrabold leading-snug text-white">
              {NAVARRO_INSTITUCIONAL.nome}
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
              <MetaItem label="CNPJ" value={NAVARRO_INSTITUCIONAL.cnpj} />
              <MetaItem
                label="Responsável"
                value={relatorio.gerado_por?.trim() || "—"}
              />
              <MetaItem label="Emissão" value={`${data} · ${hora}`} />
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <IndicadorCapa
            label="Participantes"
            value={capa?.participantes ?? relatorio.participantes ?? 0}
          />
          <IndicadorCapa
            label="Respondentes"
            value={capa?.respondentes ?? relatorio.respondentes ?? 0}
          />
          <IndicadorCapa
            label="Taxa de participação"
            value={formatTaxaParticipacao(
              capa?.taxaParticipacao ?? relatorio.taxa_participacao
            )}
          />
          <IndicadorCapa
            label="Categorias avaliadas"
            value={resumo?.quantidadeDimensoes ?? 0}
          />
        </div>

        {/* Rodapé da capa — obrigatoriamente na página 1 */}
        <div className="mt-auto border-t border-[#2a4578] pt-2.5 pb-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#9eb0d0]">
            <span>Documento Técnico</span>
            <span>Avaliação de Riscos Psicossociais</span>
            <span>Confidencial</span>
            <span>Emitido pelo Sistema Navarro SST</span>
          </div>
        </div>
      </div>

      {/* Máscara print: cobre rodapé fixo na página 1 */}
      <div className="relatorio-capa-print-mask hidden" aria-hidden />
    </section>
  );
}
