"use client";

import {
  formatDataHoraRelatorio,
  formatTaxaParticipacao,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import { formatPeriodoCampanha } from "@/lib/riscos-campanha";
import { iniciaisEmpresa } from "@/lib/riscos-relatorio-view";

export function RelatorioCapa({
  relatorio,
  logoUrl,
}: {
  relatorio: RiscosRelatorioRecord;
  logoUrl?: string | null;
}) {
  const json = relatorio.resultado_json;
  const capa = json?.capa;
  const empresa = capa?.empresaNome || relatorio.empresa_nome;
  const { data, hora } = formatDataHoraRelatorio(relatorio.gerado_em);
  const periodo = formatPeriodoCampanha(
    capa?.dataInicio || "",
    capa?.dataEncerramento || ""
  );

  const metas = [
    {
      label: "Código da campanha",
      value: capa?.codigoPublico || relatorio.codigo_publico,
    },
    { label: "Período avaliado", value: periodo || "—" },
    { label: "Data de geração", value: `${data} · ${hora}` },
    { label: "Responsável", value: relatorio.gerado_por || "—" },
    {
      label: "Participantes",
      value: String(capa?.participantes ?? relatorio.participantes ?? 0),
    },
    {
      label: "Respondentes",
      value: String(capa?.respondentes ?? relatorio.respondentes ?? 0),
    },
    {
      label: "Taxa de participação",
      value: formatTaxaParticipacao(
        capa?.taxaParticipacao ?? relatorio.taxa_participacao
      ),
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[#dbe4f3] bg-gradient-to-br from-[#0b1f4d] via-[#12316f] to-[#1a3f7a] px-6 py-8 text-white shadow-[0_20px_50px_rgba(11,31,77,0.22)] sm:px-10 sm:py-10">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-[#4f63ff]/20"
        aria-hidden
      />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-6 flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`Logo ${empresa}`}
                className="h-16 w-16 rounded-2xl border border-white/20 bg-white object-contain p-1.5 shadow-lg sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-lg font-extrabold tracking-wide text-white backdrop-blur sm:h-20 sm:w-20 sm:text-xl">
                {iniciaisEmpresa(empresa)}
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                Relatório executivo
              </p>
              <p className="mt-1 text-sm font-semibold text-white/85 sm:text-base">
                {empresa}
              </p>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-[2.15rem]">
            Relatório de Avaliação dos Riscos Psicossociais
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-[15px]">
            Instrumento COPSOQ II-Br · visão consolidada e anônima para apoio à
            gestão de Saúde e Segurança do Trabalho.
          </p>
        </div>

        <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2 lg:max-w-sm">
          {metas.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-white/10 bg-white/8 px-3.5 py-3 backdrop-blur-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/50">
                {m.label}
              </p>
              <p className="mt-1 text-sm font-bold text-white">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
