import type { ESocialSummaryStats } from "@/lib/esocial-filters";

interface ESocialSummaryCardsProps {
  stats: ESocialSummaryStats;
}

const CARDS: {
  key: keyof ESocialSummaryStats;
  label: string;
  tone: string;
  format?: (v: number) => string;
}[] = [
  {
    key: "totalElegivel",
    label: "ASOs para e-Social",
    tone: "border-[#e8edf5] bg-white text-navy",
  },
  {
    key: "pendentes",
    label: "Pendentes de e-Social",
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
  },
  {
    key: "enviarUrgente",
    label: "Enviar urgente",
    tone: "border-[#fecaca]/80 bg-[#fef2f2] text-brand-red",
  },
  {
    key: "enviados",
    label: "Enviados ao e-Social",
    tone: "border-[#bbf7d0]/80 bg-[#f0fdf4] text-brand-green",
  },
  {
    key: "percentualEnviado",
    label: "Percentual enviado",
    tone: "border-[#c7d7f5]/80 bg-[#f0f4ff] text-brand-blue",
    format: (v) => `${v}%`,
  },
  {
    key: "cancelados",
    label: "Cancelados",
    tone: "border-[#e2e8f0] bg-[#f8fafc] text-[#475569]",
  },
];

export function ESocialSummaryCards({ stats }: ESocialSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {CARDS.map((card) => {
        const value = stats[card.key];
        const display = card.format ? card.format(value) : String(value);

        return (
          <div
            key={card.key}
            className={`rounded-xl border px-3.5 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${card.tone}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">{display}</p>
          </div>
        );
      })}
    </div>
  );
}
