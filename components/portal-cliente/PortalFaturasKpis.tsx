"use client";

import { formatCurrency } from "@/lib/money";
import type { PortalFaturasResumo } from "@/lib/portal-faturas";

export function PortalFaturasKpis({ resumo }: { resumo: PortalFaturasResumo }) {
  const kpis = [
    {
      label: "Em aberto",
      valor: String(resumo.totalEmAberto),
      destaque: false,
    },
    {
      label: "Vencidas",
      valor: String(resumo.totalVencidas),
      destaque: resumo.totalVencidas > 0,
    },
    {
      label: "Pagas",
      valor: String(resumo.totalPagas),
      destaque: false,
    },
    {
      label: "Total em aberto",
      valor: formatCurrency(resumo.valorEmAberto),
      destaque: false,
      grande: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className={`flex flex-col rounded-2xl border px-4 py-3.5 ${
            kpi.destaque
              ? "border-[#fca5a5] bg-[#fff5f5]"
              : "border-[#e8edf5] bg-white"
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a3b8]">
            {kpi.label}
          </span>
          <span
            className={`mt-1 font-bold tabular-nums ${
              kpi.grande ? "text-xl text-[#0b1f4d]" : "text-2xl"
            } ${kpi.destaque ? "text-[#dc2626]" : "text-[#0b1f4d]"}`}
          >
            {kpi.valor}
          </span>
        </div>
      ))}
    </div>
  );
}
