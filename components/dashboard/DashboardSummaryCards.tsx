import type { ReactNode } from "react";
import {
  IconCalendar,
  IconEsocial,
  IconFileText,
  IconShield,
  IconUsers,
} from "@/components/ui/icons/OutlineIcons";
import type { DashboardKpiKey, DashboardKpis } from "@/lib/dashboard/types";

interface DashboardSummaryCardsProps {
  kpis: DashboardKpis | null;
  onCardClick: (key: DashboardKpiKey) => void;
}

interface KpiCardConfig {
  key: DashboardKpiKey;
  title: string;
  hint: string;
  icon: ReactNode;
  tone: string;
}

export const DASHBOARD_KPI_CARD_ICONS: Record<DashboardKpiKey, ReactNode> = {
  pendenciasEsocial: <IconEsocial size={18} />,
  asosNaoRecebidosClinicas: <IconFileText size={18} />,
  asosNaoEnviadosClientes: <IconUsers size={18} />,
  periodicosVencidos: <IconShield size={18} />,
  periodicosVencendoMesAtual: <IconShield size={18} />,
  agendamentosDoDia: <IconCalendar size={18} />,
};

const PENDENCIAS_CARDS: KpiCardConfig[] = [
  {
    key: "pendenciasEsocial",
    title: "Pendências e-Social",
    hint: "referentes a meses anteriores",
    icon: <IconEsocial size={15} />,
    tone: "border-[#fecaca]/60 bg-[#fef2f2] text-brand-red",
  },
  {
    key: "asosNaoRecebidosClinicas",
    title: "ASOs não recebidos das clínicas",
    hint: "referentes a meses anteriores",
    icon: <IconFileText size={15} />,
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
  },
  {
    key: "asosNaoEnviadosClientes",
    title: "ASOs não enviados aos clientes",
    hint: "referentes a meses anteriores",
    icon: <IconUsers size={15} />,
    tone: "border-[#e9d5ff]/80 bg-[#faf5ff] text-[#7c3aed]",
  },
  {
    key: "periodicosVencidos",
    title: "Periódicos vencidos",
    hint: "referentes a meses anteriores",
    icon: <IconShield size={15} />,
    tone: "border-[#fecaca]/60 bg-[#fef2f2] text-brand-red",
  },
];

const MES_ATUAL_CARDS: KpiCardConfig[] = [
  {
    key: "agendamentosDoDia",
    title: "Agendamentos de hoje",
    hint: "agenda do dia",
    icon: <IconCalendar size={15} />,
    tone: "border-[#a7f3d0]/80 bg-[#ECFDF5] text-[#059669]",
  },
  {
    key: "periodicosVencendoMesAtual",
    title: "Periódicos vencendo neste mês",
    hint: "vencimento neste mês",
    icon: <IconShield size={15} />,
    tone: "border-[#fde68a]/70 bg-[#fffbeb] text-[#b45309]",
  },
];

function KpiCard({
  card,
  value,
  onClick,
}: {
  card: KpiCardConfig;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block min-w-0 rounded-xl border px-3.5 py-3.5 text-left shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-all hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40 ${card.tone}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2 opacity-75">
        <p className="text-[10px] font-bold uppercase leading-snug tracking-wide">
          {card.title}
        </p>
        <span className="shrink-0">{card.icon}</span>
      </div>
      <p className="text-3xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-[11px] font-medium opacity-70">{card.hint}</p>
    </button>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3">
      <h3 className="text-[15px] font-semibold tracking-[-0.2px] text-navy">
        {title}
      </h3>
      <p className="mt-0.5 text-[12px] text-app-muted">{subtitle}</p>
    </div>
  );
}

export function DashboardSummaryCards({
  kpis,
  onCardClick,
}: DashboardSummaryCardsProps) {
  if (!kpis) return null;

  return (
    <div className="space-y-5">
      <section>
        <SectionHeading
          title="Pendências de meses anteriores"
          subtitle="Itens de competências anteriores que ainda precisam de tratamento."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PENDENCIAS_CARDS.map((card) => (
            <KpiCard
              key={card.key}
              card={card}
              value={kpis[card.key]}
              onClick={() => onCardClick(card.key)}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Mês atual"
          subtitle="Acompanhamento do que acontece neste mês."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {MES_ATUAL_CARDS.map((card) => (
            <KpiCard
              key={card.key}
              card={card}
              value={kpis[card.key]}
              onClick={() => onCardClick(card.key)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
