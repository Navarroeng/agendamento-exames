"use client";

/**
 * Cabeçalho compacto exclusivo para impressão / PDF (A4).
 * Não substitui RelatorioCapa (modal) — só aparece com riscos-relatorio-print-force.
 */

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

function LogoPrint({
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
        className="h-12 w-auto max-w-[140px] object-contain object-left"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-md border border-[#dbe4f3] bg-[#f8fafc] text-xs font-extrabold text-[#0b1f4d]">
      {fallback}
    </div>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5 text-[10px] leading-snug">
      <span className="shrink-0 font-bold text-[#64748b]">{label}:</span>
      <span className="min-w-0 font-semibold text-[#0b1f4d]">{value}</span>
    </div>
  );
}

function IndicadorInline({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="min-w-0 flex-1 border-r border-[#e2e8f0] px-2 last:border-r-0 first:pl-0 last:pr-0">
      <p className="text-[8px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-extrabold tabular-nums text-[#0b1f4d]">
        {value}
      </p>
    </div>
  );
}

export function RelatorioCapaPrint({
  relatorio,
  logoUrl,
  empresaCnpj,
  campanhaStatus,
}: {
  relatorio: RiscosRelatorioRecord;
  logoUrl?: string | null;
  empresaCnpj?: string | null;
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
  const codigo = capa?.codigoPublico || relatorio.codigo_publico || "—";

  return (
    <section className="border border-[#dbe4f3] bg-white text-[#0b1f4d]">
      {/* Faixa institucional */}
      <div className="flex items-center justify-between gap-4 border-b-2 border-[#0b1f4d] bg-[#0b1f4d] px-3 py-2.5 text-white">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#e8d29e]">
            Relatório executivo · COPSOQ II-Br
          </p>
          <h2 className="mt-0.5 text-sm font-extrabold leading-tight tracking-tight">
            Avaliação dos Riscos Psicossociais
          </h2>
        </div>
        <p className="hidden text-[9px] font-semibold text-white/70 sm:block">
          Documento consolidado e anônimo
        </p>
      </div>

      {/* Logos */}
      <div className="flex items-center justify-between gap-6 border-b border-[#e8edf5] px-3 py-3">
        <LogoPrint
          src={logoUrl}
          alt={`Logo ${empresa}`}
          fallback={iniciaisEmpresa(empresa)}
        />
        <LogoPrint
          src={NAVARRO_INSTITUCIONAL.logoSrc}
          alt="Logo Navarro Engenharia"
          fallback="NE"
        />
      </div>

      {/* Blocos institucionais */}
      <div className="grid grid-cols-2 gap-4 border-b border-[#e8edf5] px-3 py-3">
        <div>
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Empresa avaliada
          </p>
          <div className="space-y-1">
            <MetaItem label="Razão Social" value={empresa} />
            <MetaItem label="CNPJ" value={cnpjCliente} />
            <MetaItem label="Código da campanha" value={codigo} />
            <MetaItem label="Período" value={periodo || "—"} />
          </div>
        </div>
        <div className="border-l border-[#e8edf5] pl-4">
          <p className="mb-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Responsável pela avaliação
          </p>
          <div className="space-y-1">
            <MetaItem label="Empresa" value={NAVARRO_INSTITUCIONAL.nome} />
            <MetaItem label="CNPJ" value={NAVARRO_INSTITUCIONAL.cnpj} />
            <MetaItem
              label="Responsável"
              value={relatorio.gerado_por?.trim() || "—"}
            />
            <MetaItem label="Data" value={data} />
            <MetaItem label="Hora" value={hora} />
          </div>
        </div>
      </div>

      {/* Indicadores em linha única */}
      <div className="flex items-stretch px-3 py-2.5">
        <IndicadorInline
          label="Participantes"
          value={capa?.participantes ?? relatorio.participantes ?? 0}
        />
        <IndicadorInline
          label="Respondentes"
          value={capa?.respondentes ?? relatorio.respondentes ?? 0}
        />
        <IndicadorInline
          label="Taxa de participação"
          value={formatTaxaParticipacao(
            capa?.taxaParticipacao ?? relatorio.taxa_participacao
          )}
        />
        <IndicadorInline
          label="Dimensões avaliadas"
          value={resumo?.quantidadeDimensoes ?? 0}
        />
        <IndicadorInline label="Status da campanha" value={statusLabel} />
      </div>
    </section>
  );
}
