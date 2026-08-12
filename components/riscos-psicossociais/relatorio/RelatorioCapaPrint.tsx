"use client";

/**
 * Página 1 exclusiva do PDF — capa institucional.
 * Oculta no modal (riscos-relatorio-print-force).
 */

import {
  formatDataHoraRelatorio,
  formatTaxaParticipacao,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";
import { formatCNPJ } from "@/lib/cnpj";
import { NAVARRO_DADOS_BANCARIOS } from "@/lib/navarro-pagamento";

const NAVARRO_INSTITUCIONAL = {
  nome: "Navarro Engenharia de Segurança e Medicina Ocupacional",
  cnpj: NAVARRO_DADOS_BANCARIOS.pixCnpj,
  logoSrc: "/logo-navarro.png",
} as const;

const VERSAO_RELATORIO = "1.0";

function LogoCapa({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="h-16 w-auto max-w-[180px] object-contain object-center"
    />
  );
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] gap-x-4 border-b border-[#eef2f7] py-2 last:border-b-0">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
        {label}
      </dt>
      <dd className="text-[13px] font-semibold leading-snug text-[#0b1f4d]">
        {value}
      </dd>
    </div>
  );
}

export function RelatorioCapaPrint({
  relatorio,
  logoUrl,
  empresaCnpj,
}: {
  relatorio: RiscosRelatorioRecord;
  logoUrl?: string | null;
  empresaCnpj?: string | null;
  /** Mantido por compatibilidade com o modal — não usado na capa. */
  campanhaStatus?: string | null;
}) {
  const capa = relatorio.resultado_json?.capa;
  const empresa = capa?.empresaNome || relatorio.empresa_nome;
  const { data, hora } = formatDataHoraRelatorio(relatorio.gerado_em);
  const periodo = formatPeriodoCampanha(
    capa?.dataInicio || "",
    capa?.dataEncerramento || ""
  );
  const cnpjCliente = formatCNPJ(empresaCnpj);
  const codigo = capa?.codigoPublico || relatorio.codigo_publico || "—";
  const temLogoCliente = Boolean(logoUrl);

  return (
    <section className="riscos-relatorio-print-capa flex min-h-[250mm] flex-col bg-white text-[#0b1f4d]">
      {/* Logos */}
      <div
        className={`flex items-center pt-6 ${
          temLogoCliente ? "justify-between gap-8" : "justify-center"
        }`}
      >
        {temLogoCliente ? (
          <>
            <LogoCapa src={logoUrl} alt={`Logo ${empresa}`} />
            <LogoCapa
              src={NAVARRO_INSTITUCIONAL.logoSrc}
              alt="Logo Navarro Engenharia"
            />
          </>
        ) : (
          <LogoCapa
            src={NAVARRO_INSTITUCIONAL.logoSrc}
            alt="Logo Navarro Engenharia"
          />
        )}
      </div>

      {/* Centro institucional */}
      <div className="flex flex-1 flex-col justify-center py-10">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#94a3b8]">
            Documento técnico
          </p>
          <h1 className="mt-4 text-[1.65rem] font-extrabold leading-tight tracking-tight text-[#0b1f4d]">
            Relatório de Avaliação dos Riscos Psicossociais
          </h1>
          <p className="mt-3 text-sm font-semibold text-[#64748b]">
            Instrumento COPSOQ II-Br
          </p>
          <div className="mx-auto mt-6 h-px w-24 bg-[#0b1f4d]/25" />
        </div>

        <div className="mx-auto mt-10 w-full max-w-lg">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
            Empresa
          </p>
          <dl>
            <Campo label="Razão Social" value={empresa} />
            <Campo label="CNPJ" value={cnpjCliente} />
            <Campo label="Código da campanha" value={codigo} />
            <Campo label="Período avaliado" value={periodo || "—"} />
            <Campo
              label="Participantes"
              value={String(capa?.participantes ?? relatorio.participantes ?? 0)}
            />
            <Campo
              label="Respondentes"
              value={String(capa?.respondentes ?? relatorio.respondentes ?? 0)}
            />
            <Campo
              label="Taxa de participação"
              value={formatTaxaParticipacao(
                capa?.taxaParticipacao ?? relatorio.taxa_participacao
              )}
            />
          </dl>
        </div>

        <div className="mx-auto mt-8 w-full max-w-lg">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#94a3b8]">
            Responsável
          </p>
          <dl>
            <Campo label="Emitido por" value={NAVARRO_INSTITUCIONAL.nome} />
            <Campo label="CNPJ" value={NAVARRO_INSTITUCIONAL.cnpj} />
            <Campo
              label="Responsável"
              value={relatorio.gerado_por?.trim() || "—"}
            />
            <Campo label="Data da emissão" value={data} />
            <Campo label="Hora da emissão" value={hora} />
            <Campo label="Versão do relatório" value={VERSAO_RELATORIO} />
          </dl>
        </div>
      </div>

      {/* Rodapé da capa */}
      <footer className="mt-auto border-t border-[#e2e8f0] pt-5 pb-2 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0b1f4d]">
          Documento Técnico · Avaliação de Riscos Psicossociais
        </p>
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
          Confidencial
        </p>
        <p className="mt-2 text-[10px] text-[#64748b]">
          Emitido automaticamente pelo Sistema Navarro SST
        </p>
      </footer>
    </section>
  );
}
