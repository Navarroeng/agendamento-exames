"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/money";
import type { GestaoComercialSerieMes } from "@/lib/gestao-comercial";

const NAVY = "#082b63";

export function GestaoComercialEvolucaoChart({
  data,
  ano,
}: {
  data: GestaoComercialSerieMes[];
  ano: number;
}) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <h4 className="mb-1 text-sm font-extrabold text-navy">
        Evolução mensal {ano}
      </h4>
      <p className="mb-4 text-xs text-app-muted">
        Valor total dos contratos fechados por mês (data da aprovação).
      </p>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-app-muted">Sem dados</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
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
              formatter={(value) => formatCurrency(Number(value) || 0)}
              labelFormatter={(label) => String(label)}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as GestaoComercialSerieMes;
                return (
                  <div className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-bold text-navy">{label}</p>
                    <p>Valor: {formatCurrency(point.valorFechado)}</p>
                    <p>Contratos: {point.quantidade}</p>
                    <p>Ticket médio: {formatCurrency(point.ticketMedio)}</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="valorFechado"
              name="Valor fechado"
              fill={NAVY}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
