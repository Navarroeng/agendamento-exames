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
import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import { montarDadosBarras } from "@/lib/riscos-relatorio-view";
import { RelatorioLegendaCores } from "@/components/riscos-psicossociais/relatorio/RelatorioLegendaCores";

export function RelatorioBarrasChart({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const data = montarDadosBarras(dimensoes);
  const chartHeight = Math.max(280, data.length * 42);

  if (data.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
            Comparativo
          </p>
          <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
            Pontuações padronizadas por dimensão
          </h3>
          <p className="mt-1 text-xs text-app-muted sm:text-sm">
            Ordenação da maior pontuação padronizada (0–4) para a menor. A cor
            reflete a classificação oficial COPSOQ.
          </p>
        </div>
        <RelatorioLegendaCores />
      </div>

      <div className="rounded-3xl border border-[#e8edf5] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5">
        <div style={{ height: chartHeight }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 4]}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="nome"
                width={150}
                tick={{ fill: "#334155", fontSize: 11, fontWeight: 600 }}
              />
              <Tooltip
                formatter={(value, _name, item) => {
                  const label =
                    (item?.payload as { classificacaoLabel?: string })
                      ?.classificacaoLabel ?? "";
                  return [
                    typeof value === "number"
                      ? `${value.toFixed(2).replace(".", ",")} · ${label}`
                      : String(value ?? "—"),
                    "Padronizada",
                  ];
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e8edf5",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="media" radius={[0, 8, 8, 0]} barSize={18}>
                {data.map((entry) => (
                  <Cell key={entry.id} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
