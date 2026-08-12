"use client";

import type { ReactNode } from "react";
import {
  formatDataHoraRelatorio,
  formatTaxaParticipacao,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import {
  formatPeriodoCampanha,
  RISCOS_CAMPANHA_STATUS_LABELS,
  type RiscosCampanhaStatus,
} from "@/lib/riscos-campanha";
import { formatCNPJ } from "@/lib/cnpj";
import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";
import { iniciaisEmpresa } from "@/lib/riscos-relatorio-view";

const NAVARRO_INSTITUCIONAL = {
  nome: "Navarro Engenharia de Segurança e Medicina Ocupacional",
  cnpj: NAVARRO_DADOS_BANCARIOS.pixCnpj,
  logoSrc: "/logo-navarro.png",
} as const;

function MetaLinha({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
        {label}
      </dt>
      <dd className="text-sm font-semibold leading-snug text-white/95">
        {value}
      </dd>
    </div>
  );
}

function IndicadorCard({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.07] px-3.5 py-3 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/50">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-extrabold tabular-nums tracking-tight text-white sm:text-xl">
        {value}
      </p>
    </div>
  );
}

function LogoPlate({
  src,
  alt,
  fallback,
}: {
  src?: string | null;
  alt: string;
  fallback: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="h-[4.5rem] w-[4.5rem] rounded-2xl border border-white/25 bg-white object-contain p-2 shadow-[0_12px_28px_rgba(0,0,0,0.22)] sm:h-[5.25rem] sm:w-[5.25rem]"
      />
    );
  }
  return (
    <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-lg font-extrabold tracking-wide text-white backdrop-blur sm:h-[5.25rem] sm:w-[5.25rem] sm:text-xl">
      {fallback}
    </div>
  );
}

export function RelatorioCapa({
  relatorio,
  logoUrl,
  empresaCnpj,
  campanhaStatus,
}: {
  relatorio: RiscosRelatorioRecord;
  logoUrl?: string | null;
  /** CNPJ da empresa avaliada (campanha) — só apresentação. */
  empresaCnpj?: string | null;
  /** Status atual da campanha — só apresentação. */
  campanhaStatus?: RiscosCampanhaStatus | string | null;
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
  const statusKey = String(campanhaStatus ?? "") as RiscosCampanhaStatus;
  const statusLabel =
    RISCOS_CAMPANHA_STATUS_LABELS[statusKey] ||
    (campanhaStatus ? String(campanhaStatus) : "—");

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-[#dbe4f3] bg-gradient-to-br from-[#071833] via-[#0b1f4d] to-[#153a7a] text-white shadow-[0_24px_60px_rgba(7,24,51,0.28)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9972b]/80 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#4f63ff]/15 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-28 left-0 h-56 w-56 rounded-full bg-[#c9972b]/10 blur-2xl"
        aria-hidden
      />

      <div className="relative px-6 pb-6 pt-7 sm:px-9 sm:pb-7 sm:pt-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#e8d29e]">
              Relatório executivo · COPSOQ II-Br
            </p>
            <h2 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.85rem]">
              Avaliação dos Riscos Psicossociais
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
              Documento corporativo consolidado e anônimo para apoio à gestão de
              Saúde e Segurança do Trabalho.
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          {/* Empresa avaliada */}
          <div>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Empresa avaliada
            </p>
            <div className="flex items-start gap-4">
              <LogoPlate
                src={logoUrl}
                alt={`Logo ${empresa}`}
                fallback={iniciaisEmpresa(empresa)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-extrabold leading-snug text-white sm:text-xl">
                  {empresa}
                </p>
                <dl className="mt-3 space-y-2.5">
                  <MetaLinha label="CNPJ" value={cnpjCliente} />
                  <MetaLinha
                    label="Campanha"
                    value={capa?.codigoPublico || relatorio.codigo_publico || "—"}
                  />
                  <MetaLinha label="Período" value={periodo || "—"} />
                </dl>
              </div>
            </div>
          </div>

          {/* Responsável técnico */}
          <div className="lg:border-l lg:border-white/10 lg:pl-10">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Responsável pela avaliação
            </p>
            <div className="flex items-start gap-4">
              <LogoPlate
                src={NAVARRO_INSTITUCIONAL.logoSrc}
                alt="Logo Navarro Engenharia"
                fallback="NE"
              />
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold leading-snug text-white sm:text-lg">
                  {NAVARRO_INSTITUCIONAL.nome}
                </p>
                <dl className="mt-3 space-y-2.5">
                  <MetaLinha label="CNPJ" value={NAVARRO_INSTITUCIONAL.cnpj} />
                  <MetaLinha
                    label="Emissão"
                    value={relatorio.gerado_por?.trim() || "—"}
                  />
                  <MetaLinha label="Data" value={data} />
                  <MetaLinha label="Hora" value={hora} />
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <IndicadorCard
            label="Participantes"
            value={capa?.participantes ?? relatorio.participantes ?? 0}
          />
          <IndicadorCard
            label="Respondentes"
            value={capa?.respondentes ?? relatorio.respondentes ?? 0}
          />
          <IndicadorCard
            label="Taxa de participação"
            value={formatTaxaParticipacao(
              capa?.taxaParticipacao ?? relatorio.taxa_participacao
            )}
          />
          <IndicadorCard
            label="Dimensões avaliadas"
            value={resumo?.quantidadeDimensoes ?? 0}
          />
          <IndicadorCard label="Status da campanha" value={statusLabel} />
        </div>
      </div>
    </section>
  );
}
