import { formatCurrency } from "@/lib/money";
import type { RelatoriosKpis } from "@/lib/relatorios/types";

interface RelatoriosSummaryCardsProps {
  kpis: RelatoriosKpis | null;
}

const CARDS: {
  key: keyof RelatoriosKpis;
  label: string;
  tone: string;
  format?: (v: number) => string;
}[] = [
  { key: "totalAsosMes", label: "ASOs no mês", tone: "bg-white text-navy border-[#e8edf5]" },
  {
    key: "totalFaturado",
    label: "Total faturado",
    tone: "bg-[#f0f4ff] text-brand-blue border-[#c7d7f5]/80",
    format: formatCurrency,
  },
  {
    key: "custosClinicas",
    label: "Custos clínicas",
    tone: "bg-[#fffbeb] text-[#b45309] border-[#fde68a]/80",
    format: formatCurrency,
  },
  {
    key: "lucroBruto",
    label: "Lucro bruto",
    tone: "bg-[#f0fdf4] text-brand-green border-[#bbf7d0]/80",
    format: formatCurrency,
  },
  { key: "pendenciasEsocial", label: "Pendências e-Social", tone: "bg-[#fef2f2] text-brand-red border-[#fecaca]/80" },
  { key: "periodicosVencendo", label: "Periódicos vencendo", tone: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]/80" },
  { key: "contratosVencendo", label: "Contratos vencendo", tone: "bg-[#faf5ff] text-[#7c3aed] border-[#e9d5ff]/80" },
  { key: "contratosAtivos", label: "Contratos ativos", tone: "bg-white text-navy border-[#e8edf5]" },
  {
    key: "receitaContratualAnual",
    label: "Receita contratual anual",
    tone: "bg-[#f0f4ff] text-navy border-[#c7d7f5]/80",
    format: formatCurrency,
  },
];

export function RelatoriosSummaryCards({ kpis }: RelatoriosSummaryCardsProps) {
  if (!kpis) return null;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {CARDS.map((card) => {
        const value = kpis[card.key];
        const display = card.format ? card.format(value) : String(value);
        return (
          <div
            key={card.key}
            className={`rounded-xl border px-4 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${card.tone}`}
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
