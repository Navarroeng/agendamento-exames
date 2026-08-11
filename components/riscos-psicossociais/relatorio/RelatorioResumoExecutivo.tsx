"use client";

import type { ReactNode } from "react";
import {
  IconChart,
  IconChecklist,
  IconShield,
  IconUsers,
} from "@/components/ui/icons/OutlineIcons";
import {
  formatTaxaParticipacao,
  type RiscosRelatorioRecord,
} from "@/lib/riscos-relatorio";
import { gerarConteudoExecutivo } from "@/lib/riscos-relatorio-conteudo";
import { statusGeralResumo } from "@/lib/riscos-relatorio-view";

function CardMetric({
  label,
  value,
  hint,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-[#e8edf5] bg-white",
    ok: "border-[#bbf7d0] bg-[#f0fdf4]",
    warn: "border-[#fed7aa] bg-[#fff7ed]",
    danger: "border-[#fecaca] bg-[#fef2f2]",
    info: "border-[#c7d2fe] bg-[#eef1ff]",
  } as const;

  return (
    <div
      className={`rounded-2xl border px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            {label}
          </p>
          <p className="mt-2 text-2xl font-extrabold tabular-nums text-navy sm:text-[1.65rem]">
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs leading-snug text-app-muted">{hint}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-white/80 p-2 text-navy shadow-sm ring-1 ring-[#e8edf5]">
          {icon}
        </div>
      </div>
    </div>
  );
}

export function RelatorioResumoExecutivo({
  relatorio,
}: {
  relatorio: RiscosRelatorioRecord;
}) {
  const json = relatorio.resultado_json;
  const resumo = json?.resumoExecutivo;
  const capa = json?.capa;
  const criticas = resumo?.dimensoesCriticas?.length ?? 0;
  const status = statusGeralResumo({
    dimensoesCriticasCount: criticas,
    statusGeralMensagem: resumo?.statusGeralMensagem,
  });
  const { resumoNarrativo } = gerarConteudoExecutivo(relatorio);

  const statusTone =
    status.tom === "critico"
      ? "danger"
      : status.tom === "atencao"
        ? "warn"
        : status.tom === "ok"
          ? "ok"
          : "neutral";

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Visão executiva
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
            Resumo executivo
          </h3>
        </div>
      </div>

      <div className="mb-4 rounded-3xl border border-[#e8edf5] bg-gradient-to-br from-[#f8fafc] to-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="space-y-3 text-sm leading-relaxed text-navy">
          {resumoNarrativo.map((paragrafo) => (
            <p key={paragrafo.slice(0, 48)}>{paragrafo}</p>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <CardMetric
          label="Participação"
          value={formatTaxaParticipacao(
            resumo?.participacaoPercentual ?? capa?.taxaParticipacao
          )}
          hint={`${capa?.respondentes ?? 0} de ${capa?.participantes ?? 0} concluíram`}
          icon={<IconChart size={18} />}
          tone="info"
        />
        <CardMetric
          label="Respondentes"
          value={capa?.respondentes ?? relatorio.respondentes ?? 0}
          hint="Sessões concluídas válidas"
          icon={<IconUsers size={18} />}
        />
        <CardMetric
          label="Dimensões avaliadas"
          value={resumo?.quantidadeDimensoes ?? 0}
          hint="Dimensões COPSOQ no cálculo"
          icon={<IconChecklist size={18} />}
        />
        <CardMetric
          label="Dimensões críticas"
          value={criticas}
          hint={
            criticas > 0
              ? "Intermediário ou risco para saúde"
              : "Nenhuma dimensão crítica"
          }
          icon={<IconShield size={18} />}
          tone={criticas > 0 ? "warn" : "ok"}
        />
        <CardMetric
          label="Status geral"
          value={status.label}
          hint={resumo?.statusGeralMensagem || undefined}
          icon={<IconShield size={18} />}
          tone={statusTone}
        />
      </div>

      {(resumo?.dimensoesCriticas?.length ?? 0) > 0 ? (
        <div className="mt-4 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3">
          <p className="text-xs font-extrabold text-[#9a3412]">
            Dimensões que merecem atenção
          </p>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {resumo!.dimensoesCriticas.map((d) => (
              <li key={d.id} className="text-xs font-semibold text-[#7c2d12]">
                • {d.nome}
                <span className="font-medium text-[#9a3412]/70">
                  {" "}
                  — {d.classificacaoLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
