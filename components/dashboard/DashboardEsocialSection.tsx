import Link from "next/link";
import type { ESocialVisualStatus } from "@/lib/esocial-filters";
import type {
  DashboardEsocialRow,
  DashboardEsocialSummary,
} from "@/lib/dashboard/types";

interface DashboardEsocialSectionProps {
  summary: DashboardEsocialSummary;
  rows: DashboardEsocialRow[];
}

function EsocialStatusBadge({ status }: { status: ESocialVisualStatus }) {
  if (status === "enviado") {
    return (
      <span className="inline-block rounded-md bg-brand-green-soft px-2 py-0.5 text-[10px] font-bold text-brand-green">
        Enviado
      </span>
    );
  }
  if (status === "urgente") {
    return (
      <span className="inline-block rounded-md bg-[#fef2f2] px-2 py-0.5 text-[10px] font-bold text-brand-red ring-1 ring-[#fecaca]">
        Urgente
      </span>
    );
  }
  return (
    <span className="inline-block rounded-md bg-brand-orange-soft px-2 py-0.5 text-[10px] font-bold text-[#c96d00]">
      Pendente
    </span>
  );
}

const SUMMARY_CARDS: {
  key: keyof DashboardEsocialSummary;
  label: string;
  tone: string;
}[] = [
  {
    key: "pendente",
    label: "Pendente",
    tone: "border-[#fde68a]/80 bg-[#fffbeb] text-[#b45309]",
  },
  {
    key: "enviada",
    label: "Enviada",
    tone: "border-[#bbf7d0]/80 bg-[#f0fdf4] text-brand-green",
  },
  {
    key: "urgente",
    label: "Urgente (+30 dias)",
    tone: "border-[#fecaca]/60 bg-[#fef2f2] text-brand-red",
  },
];

export function DashboardEsocialSection({
  summary,
  rows,
}: DashboardEsocialSectionProps) {
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
          Nenhuma pendência de e-Social no momento.
        </p>
      ) : (
        <div className="table-wrap overflow-auto rounded-xl border border-[#e8edf5]">
          <table className="table-premium w-full min-w-[560px]">
            <thead>
              <tr>
                {["Empresa", "Colaborador", "Data exame", "Status"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-[12px]">{row.empresa}</td>
                  <td className="text-[12px]">{row.colaborador}</td>
                  <td className="text-[12px]">{row.dataExame}</td>
                  <td className="text-[12px]">
                    <EsocialStatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-right">
        <Link
          href="/e-social"
          className="text-[12px] font-bold text-brand-blue hover:underline"
        >
          Ver todos no e-Social →
        </Link>
      </div>
    </div>
  );
}
