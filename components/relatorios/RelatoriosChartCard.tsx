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
import { formatRelatoriosChartTick } from "@/lib/relatorios/chart-format";
import type { RelatoriosChartValueFormat } from "@/lib/relatorios/chart-format";
import type { ChartPoint } from "@/lib/relatorios/types";

interface RelatoriosChartCardProps {
  title: string;
  data: ChartPoint[];
  type?: "bar" | "line" | "multi";
  height?: number;
  /** currency = valores em R$; number = quantidade (sem R$). */
  valueFormat?: RelatoriosChartValueFormat;
}

const NAVY = "#082b63";
const BLUE = "#4354e8";
const GOLD = "#c9972b";

type ChartTooltipPayload = {
  dataKey?: string | number;
  name?: string;
  value?: number | string;
  color?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
  valueFormat,
}: {
  active?: boolean;
  payload?: readonly ChartTooltipPayload[];
  label?: string | number;
  valueFormat: RelatoriosChartValueFormat;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
      <p className="mb-1 text-[11px] font-bold text-navy">{label}</p>
      {payload.map((entry) => (
        <p
          key={String(entry.dataKey)}
          className="text-[11px] font-semibold"
          style={{ color: entry.color }}
        >
          {entry.name}: {formatRelatoriosChartTick(entry.value, valueFormat)}
        </p>
      ))}
    </div>
  );
}

export function RelatoriosChartCard({
  title,
  data,
  type = "bar",
  height = 240,
  valueFormat = "number",
}: RelatoriosChartCardProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
        <h4 className="mb-3 text-sm font-extrabold text-navy">{title}</h4>
        <p className="py-10 text-center text-sm text-app-muted">Sem dados</p>
      </div>
    );
  }

  const yTick = (value: number) => formatRelatoriosChartTick(value, valueFormat);
  const tooltip = (
    <Tooltip
      content={({ active, payload, label }) => (
        <ChartTooltip
          active={active}
          payload={payload as unknown as readonly ChartTooltipPayload[] | undefined}
          label={typeof label === "string" || typeof label === "number" ? label : undefined}
          valueFormat={valueFormat}
        />
      )}
    />
  );

  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <h4 className="mb-3 text-sm font-extrabold text-navy">{title}</h4>
      <ResponsiveContainer width="100%" height={height}>
        {type === "line" ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={yTick} width={valueFormat === "currency" ? 88 : 40} />
            {tooltip}
            <Line
              type="monotone"
              dataKey="value"
              name={valueFormat === "currency" ? "Receita" : "Valor"}
              stroke={NAVY}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        ) : type === "multi" ? (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={yTick} width={valueFormat === "currency" ? 88 : 40} />
            {tooltip}
            <Legend />
            <Bar dataKey="value" name="Faturado" fill={NAVY} radius={[4, 4, 0, 0]} />
            <Bar dataKey="value2" name="Custos" fill={BLUE} radius={[4, 4, 0, 0]} />
            <Bar dataKey="value3" name="Lucro" fill={GOLD} radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={yTick} width={valueFormat === "currency" ? 88 : 40} />
            {tooltip}
            <Bar dataKey="value" name="Quantidade" fill={NAVY} radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
