"use client";

import type {
  DashboardAgendaFilter,
  DashboardAgendaRow,
} from "@/lib/dashboard/types";

interface DashboardAgendaProps {
  rows: DashboardAgendaRow[];
  filter: DashboardAgendaFilter;
  onFilterChange: (filter: DashboardAgendaFilter) => void;
}

const FILTERS: { key: DashboardAgendaFilter; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "amanha", label: "Amanhã" },
  { key: "semana", label: "Semana" },
  { key: "atrasados", label: "Atrasados" },
];

function statusClass(tone: DashboardAgendaRow["statusTone"]): string {
  switch (tone) {
    case "active":
      return "bg-brand-green-soft text-brand-green";
    case "overdue":
      return "bg-[#fef2f2] text-brand-red ring-1 ring-[#fecaca]";
    case "draft":
      return "bg-[#f4f6fb] text-[#52617a]";
    case "cancelled":
      return "bg-[#f4f6fb] text-[#94a3b8] line-through";
    default:
      return "bg-brand-orange-soft text-[#c96d00]";
  }
}

export function DashboardAgenda({
  rows,
  filter,
  onFilterChange,
}: DashboardAgendaProps) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={[
              "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
              filter === f.key
                ? "bg-brand-blue text-white"
                : "border border-[#dbe4f4] bg-white text-[#52617a] hover:bg-brand-blue-soft",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-app-muted">
          Nenhum agendamento para este período.
        </p>
      ) : (
        <div className="table-wrap overflow-auto rounded-xl border border-[#e8edf5]">
          <table className="table-premium w-full min-w-[720px]">
            <thead>
              <tr>
                {[
                  "Colaborador",
                  "Empresa",
                  "Tipo ASO",
                  "Horário",
                  "Clínica",
                  "Status",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="text-[12px] font-medium">{row.colaborador}</td>
                  <td className="text-[12px]">{row.empresa}</td>
                  <td className="text-[12px]">{row.tipoAso}</td>
                  <td className="text-[12px]">{row.horario}</td>
                  <td className="text-[12px]">{row.clinica}</td>
                  <td className="text-[12px]">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${statusClass(row.statusTone)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
