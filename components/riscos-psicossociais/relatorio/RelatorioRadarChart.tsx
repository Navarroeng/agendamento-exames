"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RiscosRelatorioDimensaoSnapshot } from "@/lib/riscos-relatorio";
import { montarDadosRadar } from "@/lib/riscos-relatorio-view";

export function RelatorioRadarChart({
  dimensoes,
}: {
  dimensoes: readonly RiscosRelatorioDimensaoSnapshot[];
}) {
  const data = montarDadosRadar(dimensoes);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-[#f8fafc] px-4 py-10 text-center text-sm text-app-muted">
        Sem dimensões quantitativas suficientes para o gráfico radar.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">
          Resultado geral
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-navy sm:text-xl">
          Panorama das dimensões
        </h3>
        <p className="mt-1 text-xs text-app-muted sm:text-sm">
          Cada eixo usa favorabilidade relativa (0–1), comparável entre
          dimensões em escala 0–4 e 0–5. O tooltip exibe a pontuação técnica
          real da dimensão.
        </p>
      </div>

      <div className="rounded-3xl border border-[#e8edf5] bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="h-[320px] w-full sm:h-[380px] lg:h-[420px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={data}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="dimensao"
                tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 1]}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Favorabilidade"
                dataKey="media"
                stroke="#4f63ff"
                fill="#4f63ff"
                fillOpacity={0.28}
                strokeWidth={2}
              />
              <Tooltip
                formatter={(_value, _name, item) => {
                  const row = item?.payload as
                    | {
                        pontuacaoTecnica?: number;
                        maxEscala?: number;
                      }
                    | undefined;
                  const tec = row?.pontuacaoTecnica;
                  const max = row?.maxEscala ?? 4;
                  return [
                    tec == null
                      ? "—"
                      : `${tec.toFixed(2).replace(".", ",")} / ${max}`,
                    "Pontuação",
                  ];
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as
                    | { nomeCompleto?: string }
                    | undefined;
                  return row?.nomeCompleto ?? "";
                }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e8edf5",
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
