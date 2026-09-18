"use client";

import { montarPortalVisaoGeral } from "@/lib/portal-visao-geral";
import type { PortalAgendamentosResumo } from "@/lib/portal-agendamentos";
import type { PortalColaboradoresResumo } from "@/lib/portal-colaboradores";
import type { PortalContratoResumo } from "@/lib/portal-contrato";
import type { PortalFaturasResumo } from "@/lib/portal-faturas";
import type { PortalLaudosSstResumo } from "@/lib/portal-laudos-sst";

export function PortalVisaoGeral({
  contrato,
  faturasResumo,
  agendamentosResumo,
  laudosResumo,
  colaboradoresResumo,
}: {
  contrato: PortalContratoResumo;
  faturasResumo: PortalFaturasResumo | null;
  agendamentosResumo: PortalAgendamentosResumo | null;
  laudosResumo: PortalLaudosSstResumo | null;
  colaboradoresResumo: PortalColaboradoresResumo | null;
}) {
  const visao = montarPortalVisaoGeral({
    contrato,
    faturas: faturasResumo,
    agendamentos: agendamentosResumo,
    laudos: laudosResumo,
    colaboradores: colaboradoresResumo,
  });

  return (
    <section className="rounded-2xl border border-[#e8edf5] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(11,31,77,0.04)] sm:px-6">
      <h2 className="text-base font-semibold tracking-tight text-[#0b1f4d]">
        Visão geral
      </h2>

      <div className="mt-3 flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
            visao.temPendencias
              ? visao.pendencias.some((p) => p.tone === "bloqueio")
                ? "bg-[#fee2e2] text-[#b91c1c]"
                : "bg-[#fef3c7] text-[#b45309]"
              : "bg-[#dcfce7] text-[#15803d]"
          }`}
          aria-hidden
        >
          {visao.temPendencias ? "!" : "✓"}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#0b1f4d]">{visao.titulo}</p>
          {visao.descricao ? (
            <p className="mt-0.5 text-sm leading-relaxed text-[#64748b]">
              {visao.descricao}
            </p>
          ) : null}
          {visao.pendencias.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {visao.pendencias.map((item) => (
                <li
                  key={item.id}
                  className={`text-sm ${
                    item.tone === "bloqueio"
                      ? "text-[#b91c1c]"
                      : "text-[#b45309]"
                  }`}
                >
                  {item.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {visao.indicadores.map((item) => (
          <li
            key={item.id}
            className="rounded-xl bg-[#f8fafc] px-3 py-2 text-sm text-[#475569]"
          >
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
