import Link from "next/link";
import {
  periodicoDisplayStatusClass,
  periodicoDisplayStatusLabel,
} from "@/lib/periodicos-futuro";
import type {
  DashboardPeriodicosRow,
  DashboardPeriodicosSummary,
} from "@/lib/dashboard/types";

interface DashboardPeriodicosSectionProps {
  summary: DashboardPeriodicosSummary;
  rows: DashboardPeriodicosRow[];
}

const SUMMARY_CARDS: {
  key: keyof DashboardPeriodicosSummary;
  label: string;
  tone: string;
}[] = [
  {
    key: "vencendo30Dias",
    label: "Vencendo em 30 dias",
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
  },
  {
    key: "vencidos",
    label: "Vencidos",
    tone: "border-[#fecaca]/60 bg-[#fef2f2] text-brand-red",
  },
  {
    key: "reagendados",
    label: "Reagendados",
    tone: "border-[#c7d7f5]/80 bg-[#f0f4ff] text-brand-blue",
  },
];

export function DashboardPeriodicosSection({
  summary,
  rows,
}: DashboardPeriodicosSectionProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {SUMMARY_CARDS.map((card) => (
          <div
            key={card.key}
            className={`rounded-xl border px-3.5 py-3 shadow-[0_2px_12px_rgba(15,23,42,0.04)] ${card.tone}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">
              {card.label}
            </p>
            <p className="mt-1 text-xl font-extrabold tabular-nums">
              {summary[card.key]}
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-center text-sm text-app-muted">
          Nenhum periódico crítico no momento.
        </p>
      ) : (
        <div className="table-wrap overflow-auto rounded-xl border border-[#e8edf5]">
          <table className="table-premium w-full min-w-[640px]">
            <thead>
              <tr>
                {[
                  "Empresa",
                  "Colaborador",
                  "Exame",
                  "Próxima data",
                  "Status",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-[12px]">{row.empresa}</td>
                  <td className="text-[12px]">{row.colaborador}</td>
                  <td className="text-[12px]">{row.exame}</td>
                  <td className="text-[12px]">{row.proximaData}</td>
                  <td
                    className={`text-[12px] font-bold ${periodicoDisplayStatusClass(row.status)}`}
                  >
                    {periodicoDisplayStatusLabel(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-right">
        <Link
          href="/periodicos-futuros"
          className="text-[12px] font-bold text-brand-blue hover:underline"
        >
          Ver todos os periódicos →
        </Link>
      </div>
    </div>
  );
}
