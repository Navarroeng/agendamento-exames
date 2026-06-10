import Link from "next/link";
import type {
  DashboardAtencaoCard,
  DashboardAlertPriority,
} from "@/lib/dashboard/types";

interface DashboardAtencaoProps {
  cards: DashboardAtencaoCard[];
}

function priorityLabel(p: DashboardAlertPriority): string {
  if (p === "alta") return "Alta";
  if (p === "media") return "Média";
  return "Baixa";
}

function priorityClass(p: DashboardAlertPriority): string {
  if (p === "alta") return "bg-[#fef2f2] text-brand-red border-[#fecaca]";
  if (p === "media") return "bg-[#fffbeb] text-[#b45309] border-[#fde68a]";
  return "bg-[#f4f6fb] text-[#52617a] border-[#e2e8f0]";
}

export function DashboardAtencao({ cards }: DashboardAtencaoProps) {
  if (cards.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-app-muted">
        Nenhum item requer atenção imediata.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <Link
          key={card.id}
          href={card.href}
          className="group rounded-xl border border-[#e8edf5] bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all hover:border-brand-blue/30 hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span
              className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${priorityClass(card.priority)}`}
            >
              {priorityLabel(card.priority)}
            </span>
            <span className="text-2xl font-extrabold tabular-nums text-navy">
              {card.count}
            </span>
          </div>
          <p className="text-sm font-bold text-navy group-hover:text-brand-blue">
            {card.title}
          </p>
          <p className="mt-0.5 text-[12px] text-app-muted">{card.description}</p>
        </Link>
      ))}
    </div>
  );
}
