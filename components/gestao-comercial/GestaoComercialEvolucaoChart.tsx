"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/money";
import {
  labelOrigemGestaoComercial,
  type GestaoComercialSerieMes,
} from "@/lib/gestao-comercial";

const NAVY = "#082b63";
const HIST = "#94a3b8";

export function GestaoComercialEvolucaoChart({
  data,
  ano,
  totalAnual,
}: {
  data: GestaoComercialSerieMes[];
  ano: number;
  totalAnual?: number;
}) {
  const chartData = data.map((d) => ({
    ...d,
    valorPlot: d.valorFechado ?? 0,
  }));

  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h4 className="text-sm font-extrabold text-navy">
          Evolução mensal {ano}
        </h4>
        {totalAnual != null ? (
          <p className="text-xs font-semibold text-app-muted">
            Total anual: {formatCurrency(totalAnual)}
          </p>
        ) : null}
      </div>
      <p className="mb-2 text-xs text-app-muted">
        Valor total dos contratos fechados por mês. Meses em cinza = histórico
        anterior ao sistema.
      </p>
      <div className="mb-4 flex flex-wrap gap-3 text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NAVY }} />
          Dados reais
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: HIST }} />
          Histórico anterior ao sistema
        </span>
      </div>
      {chartData.length === 0 ? (
        <p className="py-10 text-center text-sm text-app-muted">Sem dados</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis
              tick={{ fontSize: 10 }}
              tickFormatter={(v) =>
                Number(v) >= 1000
                  ? `${(Number(v) / 1000).toFixed(0)}k`
                  : String(v)
              }
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as GestaoComercialSerieMes & {
                  valorPlot?: number;
                };
                if (point.valorFechado == null) {
                  return (
                    <div className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-xs shadow-md">
                      <p className="font-bold text-navy">{label}</p>
                      <p>Sem valor</p>
                    </div>
                  );
                }
                return (
                  <div className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-bold text-navy">{label}</p>
                    <p>Valor: {formatCurrency(point.valorFechado)}</p>
                    <p>Origem: {labelOrigemGestaoComercial(point.origem)}</p>
                    {point.origem === "sistema" ? (
                      <>
                        <p>Contratos: {point.quantidade ?? 0}</p>
                        <p>
                          Ticket médio:{" "}
                          {formatCurrency(point.ticketMedio ?? 0)}
                        </p>
                      </>
                    ) : (
                      <p className="text-app-muted">
                        Detalhes indisponíveis no histórico consolidado.
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Bar dataKey="valorPlot" name="Valor fechado" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.mes}
                  fill={
                    entry.origem === "historico_manual" ? HIST : NAVY
                  }
                  fillOpacity={entry.valorFechado == null ? 0 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
