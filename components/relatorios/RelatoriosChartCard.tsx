"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPoint } from "@/lib/relatorios/types";

interface RelatoriosChartCardProps {
  title: string;
  data: ChartPoint[];
  type?: "bar" | "line" | "multi";
  height?: number;
}

const NAVY = "#082b63";
const BLUE = "#4354e8";
const GOLD = "#c9972b";

export function RelatoriosChartCard({
  title,
  data,
  type = "bar",
  height = 240,
}: RelatoriosChartCardProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <h4 className="mb-3 text-sm font-extrabold text-navy">{title}</h4>
        <p className="py-10 text-center text-sm text-app-muted">Sem dados</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <h4 className="mb-3 text-sm font-extrabold text-navy">{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="value"
              stroke={NAVY}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        ) : type === "multi" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Faturado" fill={NAVY} radius={[4, 4, 0, 0]} />
            <Bar dataKey="value2" name="Custos" fill={BLUE} radius={[4, 4, 0, 0]} />
            <Bar dataKey="value3" name="Lucro" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="value" fill={NAVY} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
