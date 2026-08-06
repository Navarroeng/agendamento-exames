"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/money";
import {
  labelOrigemAnoGestaoComercial,
  type GestaoComercialEvolucaoAnual,
} from "@/lib/gestao-comercial";

const CORES_ANO = [
  "#0f766e",
  "#1d4ed8",
  "#b45309",
  "#082b63",
  "#7c3aed",
  "#be123c",
];

type ModoVisualizacao = "anual" | "acumulado";

function corAno(ano: number, anos: number[]): string {
  const idx = Math.max(0, anos.indexOf(ano));
  return CORES_ANO[idx % CORES_ANO.length];
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sinal = value > 0 ? "+" : "";
  return `${sinal}${value.toFixed(1).replace(".", ",")}%`;
}

function tendenciaClass(
  tendencia: "alta" | "baixa" | "igual" | "sem_base" | null | undefined
): string {
  if (tendencia === "alta") return "text-[#15803d]";
  if (tendencia === "baixa") return "text-[#b91c1c]";
  return "text-[#64748b]";
}

export function GestaoComercialEvolucaoAnualChart({
  evolucao,
}: {
  evolucao: GestaoComercialEvolucaoAnual;
}) {
  const [modo, setModo] = useState<ModoVisualizacao>("anual");
  const [anosOcultos, setAnosOcultos] = useState<Set<number>>(new Set());

  const anos = evolucao.anosDisponiveis;
  const chartAnual = useMemo(
    () =>
      evolucao.pontosAnuais.map((p) => ({
        ...p,
        valorPlot: p.valorTotal,
        labelAno: String(p.ano),
      })),
    [evolucao.pontosAnuais]
  );

  const chartAcumulado = useMemo(() => {
    return evolucao.acumuladoMensal.map((row) => {
      const out: Record<string, string | number | null> = {
        label: row.label,
        mes: row.mes,
      };
      for (const ano of anos) {
        out[`y${ano}`] = anosOcultos.has(ano) ? null : row.porAno[ano] ?? null;
      }
      return out;
    });
  }, [anos, anosOcultos, evolucao.acumuladoMensal]);

  function toggleAno(ano: number) {
    setAnosOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(ano)) next.delete(ano);
      else next.add(ano);
      return next;
    });
  }

  const melhor = evolucao.melhorAnoCompleto;
  const cresc = evolucao.crescimentoUltimosCompletos;
  const atualCmp = evolucao.anoAtualVsMesmoPeriodo;

  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-extrabold text-navy">
            Evolução anual dos contratos fechados
          </h4>
          <p className="mt-1 max-w-3xl text-xs text-app-muted">
            {modo === "anual"
              ? "Acompanhe a evolução do valor contratado ao longo dos anos. O ano atual é apresentado de forma parcial e comparado ao mesmo período do ano anterior."
              : "Compare o crescimento acumulado de cada ano, de janeiro até o último mês disponível."}
          </p>
          {evolucao.historicoFiltrado ? (
            <p className="mt-1 text-[11px] font-semibold text-[#b45309]">
              Histórico filtrado pelos critérios selecionados (responsável,
              origem, tipo ou status).
            </p>
          ) : null}
        </div>
        <div className="inline-flex rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-1 text-xs font-bold">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 ${
              modo === "anual"
                ? "bg-white text-navy shadow-sm"
                : "text-[#64748b]"
            }`}
            onClick={() => setModo("anual")}
          >
            Evolução anual
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 ${
              modo === "acumulado"
                ? "bg-white text-navy shadow-sm"
                : "text-[#64748b]"
            }`}
            onClick={() => setModo("acumulado")}
          >
            Acumulado mês a mês
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Melhor ano completo
          </p>
          {melhor ? (
            <>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">
                {melhor.ano}
              </p>
              <p className="text-xs font-semibold text-[#475569]">
                {formatCurrency(melhor.valor)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-app-muted">—</p>
          )}
        </div>
        <div className="rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Crescimento anos completos
          </p>
          {cresc ? (
            <>
              <p className="mt-1 text-sm font-extrabold text-navy">
                {cresc.anoRecente} × {cresc.anoAnterior}
              </p>
              <p
                className={`text-xs font-semibold ${tendenciaClass(
                  cresc.percentual == null
                    ? "sem_base"
                    : cresc.percentual > 0
                      ? "alta"
                      : cresc.percentual < 0
                        ? "baixa"
                        : "igual"
                )}`}
              >
                {formatPct(cresc.percentual)} ·{" "}
                {cresc.diferenca >= 0 ? "+" : ""}
                {formatCurrency(cresc.diferenca)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-app-muted">—</p>
          )}
        </div>
        <div className="rounded-xl border border-[#eef2f7] bg-[#f8fafc] px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94a3b8]">
            Ano atual × mesmo período
          </p>
          {atualCmp ? (
            <>
              <p className="mt-1 text-sm font-extrabold text-navy">
                {atualCmp.periodoLabel}
              </p>
              <p className="text-[11px] text-[#64748b]">
                {atualCmp.anoAtual} vs {atualCmp.anoAnterior}
              </p>
              <p
                className={`text-xs font-semibold ${tendenciaClass(atualCmp.tendencia)}`}
              >
                {formatPct(atualCmp.percentual)} ·{" "}
                {atualCmp.diferenca >= 0 ? "+" : ""}
                {formatCurrency(atualCmp.diferenca)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm text-app-muted">—</p>
          )}
        </div>
      </div>

      {modo === "anual" ? (
        chartAnual.length === 0 ? (
          <p className="py-10 text-center text-sm text-app-muted">Sem dados</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartAnual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="labelAno" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) =>
                  Number(v) >= 1000
                    ? `${(Number(v) / 1000).toFixed(0)}k`
                    : String(v)
                }
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const point = payload[0]?.payload as (typeof chartAnual)[number];
                  return (
                    <div className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-xs shadow-md">
                      <p className="font-bold text-navy">
                        {point.ano}
                        {point.parcial ? " · Parcial" : ""}
                      </p>
                      <p>
                        {point.parcial ? "Valor acumulado" : "Valor total"}:{" "}
                        {formatCurrency(point.valorTotal)}
                      </p>
                      <p>Período: {point.periodoLabel}</p>
                      <p>
                        Origem: {labelOrigemAnoGestaoComercial(point.origem)}
                      </p>
                      {point.variacaoPercentual != null &&
                      point.anoComparavelAnterior != null ? (
                        <p className="mt-1">
                          Variação: {formatPct(point.variacaoPercentual)} em
                          relação a{" "}
                          {point.parcial
                            ? `${point.periodoLabel.toLowerCase()} de ${point.anoComparavelAnterior}`
                            : point.anoComparavelAnterior}
                        </p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="valorPlot"
                name="Valor fechado"
                stroke="#082b63"
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, payload } = props as {
                    cx?: number;
                    cy?: number;
                    payload?: (typeof chartAnual)[number];
                  };
                  if (cx == null || cy == null || !payload) return null;
                  const parcial = payload.parcial;
                  return (
                    <g>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={parcial ? 6 : 4}
                        fill={parcial ? "#fff" : "#082b63"}
                        stroke={parcial ? "#b45309" : "#082b63"}
                        strokeWidth={parcial ? 2.5 : 1}
                      />
                      {parcial ? (
                        <text
                          x={cx}
                          y={cy - 12}
                          textAnchor="middle"
                          fontSize={9}
                          fontWeight={700}
                          fill="#b45309"
                        >
                          Parcial
                        </text>
                      ) : null}
                    </g>
                  );
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {anos.map((ano) => {
              const oculto = anosOcultos.has(ano);
              const parcial = evolucao.pontosAnuais.find(
                (p) => p.ano === ano
              )?.parcial;
              return (
                <button
                  key={ano}
                  type="button"
                  onClick={() => toggleAno(ano)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    oculto
                      ? "border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8] line-through"
                      : "border-[#dbe3f0] bg-white text-navy"
                  }`}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: corAno(ano, anos) }}
                  />
                  {ano}
                  {parcial ? " (parcial)" : ""}
                </button>
              );
            })}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartAcumulado}>
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
                  return (
                    <div className="rounded-lg border border-[#e8edf5] bg-white px-3 py-2 text-xs shadow-md">
                      <p className="font-bold text-navy">{label}</p>
                      {payload.map((item) => {
                        const ano = Number(String(item.dataKey).replace("y", ""));
                        if (!Number.isFinite(ano) || item.value == null) {
                          return null;
                        }
                        return (
                          <p key={String(item.dataKey)}>
                            {ano}: {formatCurrency(Number(item.value))}
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              <Legend
                onClick={(e) => {
                  const ano = Number(String(e.dataKey).replace("y", ""));
                  if (Number.isFinite(ano)) toggleAno(ano);
                }}
              />
              {anos.map((ano) => {
                const parcial = evolucao.pontosAnuais.find(
                  (p) => p.ano === ano
                )?.parcial;
                return (
                  <Line
                    key={ano}
                    type="monotone"
                    dataKey={`y${ano}`}
                    name={String(ano)}
                    stroke={corAno(ano, anos)}
                    strokeWidth={parcial ? 2.5 : 2}
                    strokeDasharray={parcial ? "6 4" : undefined}
                    connectNulls={false}
                    dot={{ r: parcial ? 4 : 3 }}
                    hide={anosOcultos.has(ano)}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
