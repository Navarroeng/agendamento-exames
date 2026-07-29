"use client";

import type { ImplantacaoSummaryStats } from "@/lib/implantacao-clientes";

interface ImplantacaoSummaryCardsProps {
  stats: ImplantacaoSummaryStats;
}

const CARDS: {
  key: keyof ImplantacaoSummaryStats;
  label: string;
  tone: string;
}[] = [
  {
    key: "totalEmImplantacao",
    label: "Total em implantação",
    tone: "border-[#c7d7f5]/80 bg-[#f0f4ff] text-brand-blue",
  },
  {
    key: "aguardandoContrato",
    label: "Aguardando contrato",
    tone: "border-[#bfdbfe]/80 bg-[#eff6ff] text-[#1d4ed8]",
  },
  {
    key: "aguardandoPagamento",
    label: "Aguardando pagamento",
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
  },
  {
    key: "aguardandoDocumentos",
    label: "Aguardando documentos",
    tone: "border-[#e9d5ff]/80 bg-[#faf5ff] text-[#7e22ce]",
  },
  {
    key: "liberadosAgendamento",
    label: "Liberados para agendamento",
    tone: "border-[#bbf7d0]/80 bg-[#f0fdf4] text-brand-green",
  },
];

export function ImplantacaoSummaryCards({ stats }: ImplantacaoSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {CARDS.map((card) => (
        <div
          key={card.key}
          className={`rounded-xl border px-3.5 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${card.tone}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
            {card.label}
          </p>
          <p className="mt-1 text-xl font-extrabold tabular-nums">
            {stats[card.key]}
          </p>
        </div>
      ))}
    </div>
  );
}
