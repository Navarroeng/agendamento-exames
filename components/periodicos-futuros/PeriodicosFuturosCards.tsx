import {
  periodicoDisplayStatusClass,
  periodicoDisplayStatusLabel,
} from "@/lib/periodicos-futuro";
import type { PeriodicoFuturoDisplayStatus } from "@/lib/types";

interface PeriodicosFuturosCardsProps {
  counts: Record<PeriodicoFuturoDisplayStatus, number>;
  activeCard: PeriodicoFuturoDisplayStatus | "";
  onCardClick: (status: PeriodicoFuturoDisplayStatus) => void;
}

const CARD_CONFIG: {
  key: PeriodicoFuturoDisplayStatus;
  tone: string;
}[] = [
  {
    key: "vencido",
    tone: "border-[#fecaca]/60 bg-[#fef2f2]",
  },
  {
    key: "vence_30_dias",
    tone: "border-[#fde68a]/80 bg-[#fffbeb]",
  },
  {
    key: "em_dia",
    tone: "border-[#bbf7d0]/80 bg-[#f0fdf4]",
  },
  {
    key: "reagendado",
    tone: "border-[#c7d7f5]/80 bg-[#f0f4ff]",
  },
];

export function PeriodicosFuturosCards({
  counts,
  activeCard,
  onCardClick,
}: PeriodicosFuturosCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {CARD_CONFIG.map((card) => {
        const active = activeCard === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onCardClick(card.key)}
            className={`rounded-xl border px-3.5 py-3 text-left shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all ${card.tone} ${
              active
                ? "ring-2 ring-brand-blue/40"
                : "hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
            }`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-wide ${periodicoDisplayStatusClass(card.key)}`}
            >
              {periodicoDisplayStatusLabel(card.key)}
            </p>
            <p className="mt-2 text-2xl font-extrabold tabular-nums text-navy">
              {counts[card.key]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
