"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DASHBOARD_KPI_DETAIL } from "@/lib/dashboard/kpi-detail";
import type {
  DashboardKpiColumnId,
  DashboardKpiDetailRow,
  DashboardKpiKey,
  DashboardKpiStatusTone,
} from "@/lib/dashboard/types";
import { filterDashboardKpiRowsBySearch } from "@/lib/dashboard/aggregations";
import { IconSearch } from "@/components/ui/icons/OutlineIcons";

interface DashboardKpiDetailModalProps {
  kpiKey: DashboardKpiKey | null;
  rows: DashboardKpiDetailRow[];
  icon: ReactNode;
  onClose: () => void;
}

function statusClass(tone: DashboardKpiStatusTone): string {
  switch (tone) {
    case "active":
      return "bg-brand-green-soft text-brand-green";
    case "overdue":
      return "bg-[#fef2f2] text-brand-red ring-1 ring-[#fecaca]";
    case "draft":
      return "bg-[#f4f6fb] text-[#52617a]";
    case "cancelled":
      return "bg-[#f4f6fb] text-[#94a3b8]";
    default:
      return "bg-brand-orange-soft text-[#c96d00]";
  }
}

function cellValue(
  row: DashboardKpiDetailRow,
  column: DashboardKpiColumnId
): string {
  switch (column) {
    case "horario":
      return row.horario;
    case "colaborador":
      return row.colaborador;
    case "empresa":
      return row.empresa;
    case "data":
      return row.dataLabel;
    case "clinica":
      return row.clinica;
    case "tipoAso":
      return row.tipoAso;
    case "exame":
      return row.exame;
    case "status":
      return row.status;
  }
}

export function DashboardKpiDetailModal({
  kpiKey,
  rows,
  icon,
  onClose,
}: DashboardKpiDetailModalProps) {
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setBusca("");
  }, [kpiKey]);

  useEffect(() => {
    if (!kpiKey) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [kpiKey, onClose]);

  const filtered = useMemo(
    () => filterDashboardKpiRowsBySearch(rows, busca),
    [rows, busca]
  );

  if (!kpiKey) return null;

  const meta = DASHBOARD_KPI_DETAIL[kpiKey];
  const empty =
    rows.length === 0
      ? meta.emptyMessage
      : "Nenhum registro encontrado para esta busca.";

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1333]/55 backdrop-blur-md"
        onClick={onClose}
        aria-label="Fechar"
      />

      <div
        className="animate-modal-in relative flex max-h-[96vh] w-full max-w-[1040px] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_40px_80px_-20px_rgba(45,35,95,0.35)] sm:rounded-[24px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-kpi-modal-title"
      >
        <header className="relative shrink-0 border-b border-[#e8edf5] bg-gradient-to-br from-[#f8faff] to-white px-5 py-5 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-[#e8edf5] bg-white text-lg text-[#8b95a8] shadow-sm transition hover:border-[#d4d9e8] hover:text-[#5b4acb] sm:right-5 sm:top-5"
            aria-label="Fechar"
          >
            ×
          </button>
          <div className="flex items-start gap-3 pr-10">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#5668ff] to-[#4354e8] text-white shadow-[0_10px_24px_rgba(79,99,255,0.32)]">
              {icon}
            </div>
            <div className="min-w-0">
              <h2
                id="dashboard-kpi-modal-title"
                className="text-lg font-extrabold leading-tight text-[#2d2a4a] sm:text-xl"
              >
                {meta.title}
              </h2>
              <p className="mt-1 text-sm text-[#8b95a8]">{meta.subtitle}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13px] font-semibold text-navy">
              <span className="text-2xl font-extrabold tabular-nums text-[#4354e8]">
                {rows.length}
              </span>{" "}
              registro{rows.length === 1 ? "" : "s"}
              {busca.trim() && filtered.length !== rows.length
                ? ` · ${filtered.length} na busca`
                : ""}
            </p>
            <label className="relative block w-full sm:max-w-[280px]">
              <span className="sr-only">Buscar por colaborador ou empresa</span>
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
                <IconSearch size={15} />
              </span>
              <input
                type="search"
                className="field-input field-input-compact !h-10 pl-9"
                placeholder="Buscar colaborador ou empresa"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </label>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f9fc] px-5 py-4 sm:px-7">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-app-muted">{empty}</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#e8edf5] bg-white">
              <table className="table-premium w-full min-w-[720px]">
                <thead>
                  <tr>
                    {meta.columns.map((column) => (
                      <th key={column.id}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id}>
                      {meta.columns.map((column) => (
                        <td
                          key={column.id}
                          className={
                            column.id === "colaborador"
                              ? "text-[12px] font-medium"
                              : "text-[12px]"
                          }
                        >
                          {column.id === "status" ? (
                            <span
                              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${statusClass(row.statusTone)}`}
                            >
                              {row.status}
                            </span>
                          ) : (
                            cellValue(row, column.id)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t border-[#e8edf5] bg-[#f8f9fc] px-5 py-4 sm:px-7">
          <button type="button" className="btn" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
