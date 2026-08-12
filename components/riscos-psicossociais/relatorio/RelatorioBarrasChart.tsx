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

function TooltipBarras({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ReturnType<typeof montarDadosBarras>[number] }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const isRisco = String(row.tipo).toUpperCase() === "RISCO";
  const mediaTxt = row.media.toFixed(2).replace(".", ",");

  return (
    <div className="max-w-xs rounded-xl border border-[#e8edf5] bg-white px-3 py-2.5 text-xs shadow-md">
      <p className="font-extrabold text-navy">{row.nome}</p>
      <p className="mt-1 text-app-muted">
        Pontuação padronizada:{" "}
        <span className="font-bold text-navy">{mediaTxt} / 4</span>
      </p>
      <p className="mt-0.5 font-bold text-navy">{row.classificacaoLabel}</p>
      {isRisco ? (
        <p className="mt-1.5 text-[11px] leading-snug text-app-muted">
          Para esta dimensão, pontuações menores representam melhores
          resultados.
        </p>
      ) : null}
    </div>
  );
}

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
            Resultado das dimensões
          </h3>
          <p className="mt-1 text-xs text-app-muted sm:text-sm">
            O comprimento da barra indica favorabilidade visual (melhor à
            esquerda/maior). Em dimensões de risco, pontuações técnicas menores
            aparecem com barras maiores. A cor segue a classificação oficial
            COPSOQ.
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
              <Tooltip content={<TooltipBarras />} />
              <Bar dataKey="valorVisual" radius={[0, 8, 8, 0]} barSize={18}>
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
