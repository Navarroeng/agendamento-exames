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
    <div className="flex min-w-0 flex-col items-start gap-2.5 sm:items-center sm:text-center">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-20 w-auto max-w-[11rem] rounded-2xl border border-white/20 bg-white object-contain p-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)] sm:h-24 sm:max-w-[13rem] sm:p-3.5"
        />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-extrabold tracking-wide text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur sm:h-24 sm:w-24 sm:text-2xl">
          {fallback}
        </div>
      )}
      <p className="max-w-[13rem] text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
        {caption}
      </p>
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-white/95 sm:text-[15px]">
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
    <div className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-white">
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
  /** CNPJ da empresa avaliada (campanha) — só apresentação. */
  empresaCnpj?: string | null;
  /** Mantido por compatibilidade com o modal — não exibido na capa premium. */
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
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[#dbe4f3] bg-gradient-to-br from-[#061428] via-[#0b1f4d] to-[#1a4488] text-white shadow-[0_28px_70px_rgba(7,24,51,0.32)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9972b]/85 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#4f63ff]/18 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#c9972b]/12 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
        aria-hidden
      />

      <div className="relative px-6 pb-7 pt-8 sm:px-10 sm:pb-9 sm:pt-10">
        {/* Logos */}
        <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-7">
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

        {/* Título principal */}
        <div className="mx-auto mt-9 max-w-3xl text-center sm:mt-11">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#e8d29e]">
            Documento Técnico
          </p>
          <h2 className="mt-4 text-[1.65rem] font-extrabold leading-[1.12] tracking-tight sm:text-[2.15rem] lg:text-[2.35rem]">
            Relatório de Avaliação
            <br />
            dos Riscos Psicossociais
          </h2>
          <p className="mt-4 text-sm font-semibold text-white/70 sm:text-base">
            Instrumento COPSOQ II-Br
          </p>
          <div className="mx-auto mt-6 h-px w-20 bg-gradient-to-r from-transparent via-[#c9972b]/90 to-transparent" />
        </div>

        {/* Empresa + Responsável */}
        <div className="mt-9 grid gap-5 lg:mt-11 lg:grid-cols-2 lg:gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e8d29e]/90">
              Empresa avaliada
            </p>
            <p className="mt-3 text-lg font-extrabold leading-snug text-white sm:text-xl">
              {empresa}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MetaItem label="Razão Social" value={empresa} />
              <MetaItem label="CNPJ" value={cnpjCliente} />
              <MetaItem label="Código da campanha" value={codigo} />
              <MetaItem label="Período avaliado" value={periodo || "—"} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5 sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#e8d29e]/90">
              Responsável pela avaliação
            </p>
            <p className="mt-3 text-lg font-extrabold leading-snug text-white sm:text-[1.15rem]">
              {NAVARRO_INSTITUCIONAL.nome}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MetaItem label="CNPJ" value={NAVARRO_INSTITUCIONAL.cnpj} />
              <MetaItem
                label="Responsável pela emissão"
                value={relatorio.gerado_por?.trim() || "—"}
              />
              <MetaItem label="Data da emissão" value={data} />
              <MetaItem label="Hora da emissão" value={hora} />
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-3.5">
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

        {/* Rodapé da capa */}
        <div className="mt-8 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40 sm:justify-between sm:text-left">
            <span>Documento Técnico</span>
            <span className="hidden text-white/20 sm:inline" aria-hidden>
              ·
            </span>
            <span>Avaliação de Riscos Psicossociais</span>
            <span className="hidden text-white/20 sm:inline" aria-hidden>
              ·
            </span>
            <span>Confidencial</span>
            <span className="hidden text-white/20 sm:inline" aria-hidden>
              ·
            </span>
            <span>Emitido pelo Sistema Navarro SST</span>
          </div>
        </div>
      </div>
    </section>
  );
}
