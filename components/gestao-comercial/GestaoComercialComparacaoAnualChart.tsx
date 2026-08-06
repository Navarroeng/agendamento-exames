"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/money";
import {
  labelOrigemGestaoComercial,
  type GestaoComercialSerieAnualMes,
} from "@/lib/gestao-comercial";

const COR_A = "#082b63";
const COR_B = "#4354e8";

export function GestaoComercialComparacaoAnualChart({
  data,
  anoA,
  anoB,
}: {
  data: GestaoComercialSerieAnualMes[];
  anoA: number;
  anoB: number;
}) {
  const chartData = data.map((d) => ({
    ...d,
    plotA: d.valorAnoA ?? undefined,
    plotB: d.valorAnoB ?? undefined,
  }));

  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <h4 className="mb-1 text-sm font-extrabold text-navy">
        Comparação anual {anoA} × {anoB}
      </h4>
      <p className="mb-4 text-xs text-app-muted">
        Mesmo mês lado a lado. Meses sem dado real ou histórico não exibem zero.
      </p>
      <ResponsiveContainer width="100%" height={300}>
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
              const point = payload[0]?.payload as GestaoComercialSerieAnualMes;
              return (
                <div className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-bold text-navy">{label}</p>
                  <p className="mt-1">
                    {anoA}:{" "}
                    {point.valorAnoA == null
                      ? "Sem valor"
                      : formatCurrency(point.valorAnoA)}
                    {point.origemAnoA
                      ? ` · ${labelOrigemGestaoComercial(point.origemAnoA)}`
                      : ""}
                  </p>
                  <p>
                    {anoB}:{" "}
                    {point.valorAnoB == null
                      ? "Sem valor"
                      : formatCurrency(point.valorAnoB)}
                    {point.origemAnoB
                      ? ` · ${labelOrigemGestaoComercial(point.origemAnoB)}`
                      : ""}
                  </p>
                </div>
              );
            }}
          />
          <Legend />
          <Bar
            dataKey="plotA"
            name={String(anoA)}
            fill={COR_A}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="plotB"
            name={String(anoB)}
            fill={COR_B}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
