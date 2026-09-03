"use client";

import {
  filtrarPortalFaturas,
  PORTAL_FATURA_STATUS_LABELS,
  PORTAL_FATURA_FILTROS_DEFAULT,
  type PortalFaturaFiltros,
  type PortalFaturaLinha,
  type PortalFaturaStatusFiltro,
} from "@/lib/portal-faturas";
import { useState } from "react";

const STATUS_FILTRO_OPCOES: { valor: PortalFaturaStatusFiltro; label: string }[] =
  [
    { valor: "todas", label: "Todas" },
    { valor: "emitida", label: "Em aberto" },
    { valor: "vencida", label: "Vencidas" },
    { valor: "paga", label: "Pagas" },
    { valor: "cancelada", label: "Canceladas" },
  ];

function StatusBadge({ status }: { status: PortalFaturaLinha["status"] }) {
  const estilos: Record<typeof status, string> = {
    emitida:
      "bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]",
    vencida:
      "bg-[#fff5f5] text-[#dc2626] border border-[#fca5a5]",
    paga:
      "bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]",
    cancelada:
      "bg-[#f8fafc] text-[#94a3b8] border border-[#e2e8f0]",
    outros: "bg-[#f8fafc] text-[#94a3b8] border border-[#e2e8f0]",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estilos[status]}`}
    >
      {status === "vencida" ? "🔴 " : ""}
      {PORTAL_FATURA_STATUS_LABELS[status]}
    </span>
  );
}

export function PortalFaturasListagem({
  faturas,
  onVisualizarFatura,
}: {
  faturas: PortalFaturaLinha[];
  onVisualizarFatura: (faturaId: string) => void;
}) {
  const [filtros, setFiltros] = useState<PortalFaturaFiltros>(
    PORTAL_FATURA_FILTROS_DEFAULT
  );

  const atualizarFiltro = <K extends keyof PortalFaturaFiltros>(
    campo: K,
    valor: PortalFaturaFiltros[K]
  ) => setFiltros((prev) => ({ ...prev, [campo]: valor }));

  const faturasVisiveis = filtrarPortalFaturas(faturas, filtros);

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
            Status
          </label>
          <select
            className="h-9 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
            value={filtros.status}
            onChange={(e) =>
              atualizarFiltro(
                "status",
                e.target.value as PortalFaturaStatusFiltro
              )
            }
          >
            {STATUS_FILTRO_OPCOES.map((op) => (
              <option key={op.valor} value={op.valor}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]">
            Competência
          </label>
          <input
            type="text"
            placeholder="MM/AAAA"
            className="h-9 w-32 rounded-lg border border-[#e2e8f0] bg-white px-3 text-sm text-[#0b1f4d] outline-none focus:border-[#0b1f4d]"
            value={filtros.competencia}
            onChange={(e) => atualizarFiltro("competencia", e.target.value)}
            maxLength={7}
          />
        </div>

        {filtros.status !== "cancelada" && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#64748b]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#cbd5e1] accent-[#0b1f4d]"
              checked={filtros.mostrarCanceladas}
              onChange={(e) =>
                atualizarFiltro("mostrarCanceladas", e.target.checked)
              }
            />
            Mostrar canceladas
          </label>
        )}
      </div>

      {/* Tabela — desktop */}
      {faturasVisiveis.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#94a3b8]">
          Nenhuma fatura encontrada com os filtros aplicados.
        </p>
      ) : (
        <>
          {/* Tabela horizontal (md+) */}
          <div className="hidden overflow-x-auto rounded-2xl border border-[#e8edf5] md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#e8edf5] bg-[#f8fafc]">
                <tr>
                  {[
                    "Nº",
                    "Competência",
                    "Emissão",
                    "Vencimento",
                    "Valor",
                    "Status",
                    "Ação",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94a3b8]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {faturasVisiveis.map((f) => (
                  <tr
                    key={f.id}
                    className="bg-white transition-colors hover:bg-[#f8fafc]"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#0b1f4d]">
                      {f.numero}
                    </td>
                    <td className="px-4 py-3 text-[#475569]">
                      {f.competencia ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#475569]">
                      {f.dataEmissao ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#475569]">
                      {f.dataVencimento}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-[#0b1f4d]">
                      {f.valorFormatado}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onVisualizarFatura(f.id)}
                        className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0b1f4d] transition hover:bg-[#f1f5f9]"
                      >
                        Visualizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards mobile (< md) */}
          <div className="flex flex-col gap-3 md:hidden">
            {faturasVisiveis.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border border-[#e8edf5] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-[#0b1f4d]">
                    {f.numero}
                  </span>
                  <StatusBadge status={f.status} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-[#94a3b8]">Competência</span>
                  <span className="text-[#475569]">{f.competencia ?? "—"}</span>
                  <span className="text-[#94a3b8]">Vencimento</span>
                  <span className="text-[#475569]">{f.dataVencimento}</span>
                  <span className="text-[#94a3b8]">Valor</span>
                  <span className="font-semibold text-[#0b1f4d]">
                    {f.valorFormatado}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onVisualizarFatura(f.id)}
                  className="mt-3 w-full rounded-lg border border-[#e2e8f0] bg-white py-2 text-sm font-semibold text-[#0b1f4d] transition hover:bg-[#f1f5f9]"
                >
                  Visualizar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
