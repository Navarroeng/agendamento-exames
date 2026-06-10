import type { DashboardKpis } from "@/lib/dashboard/types";
import {
  IconCalendar,
  IconEsocial,
  IconFileText,
  IconShield,
  IconUsers,
} from "@/components/ui/icons/OutlineIcons";
import type { ReactNode } from "react";

interface DashboardSummaryCardsProps {
  kpis: DashboardKpis | null;
}

const CARDS: {
  key: keyof DashboardKpis;
  label: string;
  icon: ReactNode;
  tone: string;
}[] = [
  {
    key: "agendamentosDoDia",
    label: "Agendamentos do dia",
    icon: <IconCalendar size={15} />,
    tone: "border-[#e8edf5] bg-white text-navy",
  },
  {
    key: "pendenciasEsocial",
    label: "Pendências e-Social",
    icon: <IconEsocial size={15} />,
    tone: "border-[#fecaca]/60 bg-[#fef2f2] text-brand-red",
  },
  {
    key: "asosPendentesAssinatura",
    label: "ASOs pendentes de assinatura",
    icon: <IconFileText size={15} />,
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
  },
  {
    key: "asosPendentesEnvioCliente",
    label: "ASOs pendentes de envio ao cliente",
    icon: <IconUsers size={15} />,
    tone: "border-[#e9d5ff]/80 bg-[#faf5ff] text-[#7c3aed]",
  },
  {
    key: "periodicosVencendo30Dias",
    label: "Periódicos vencendo em 30 dias",
    icon: <IconShield size={15} />,
    tone: "border-[#fed7aa]/80 bg-[#fff7ed] text-[#c2410c]",
  },
  {
    key: "periodicosVencidos",
    label: "Periódicos vencidos",
    icon: <IconShield size={15} />,
    tone: "border-[#fecaca]/60 bg-[#fef2f2] text-brand-red",
  },
  {
    key: "totalAsosMes",
    label: "Total de ASOs no mês",
    icon: <IconFileText size={15} />,
    tone: "border-[#e8edf5] bg-[#f8fafc] text-navy",
  },
];

export function DashboardSummaryCards({ kpis }: DashboardSummaryCardsProps) {
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-3">
      {CARDS.map((card) => {
        const value = kpis[card.key];
        return (
          <div
            key={card.key}
            className={`rounded-xl border px-3.5 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${card.tone}`}
          >
            <div className="mb-2 flex items-center justify-between opacity-70">
              <p className="text-[10px] font-bold uppercase tracking-wide">
                {card.label}
              </p>
              {card.icon}
            </div>
            <p className="text-xl font-extrabold tabular-nums">{value}</p>
          </div>
        );
      })}
    </div>
  );
}
