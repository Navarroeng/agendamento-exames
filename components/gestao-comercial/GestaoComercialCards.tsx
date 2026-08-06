"use client";

import { formatCurrency } from "@/lib/money";
import {
  formatComparacaoDiferenca,
  GESTAO_COMERCIAL_DISCLAIMER,
  MESES_PT,
  type GestaoComercialDashboard,
} from "@/lib/gestao-comercial";

function Card({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "up" | "down" | "neutral" | "muted";
}) {
  const hintClass =
    tone === "up"
      ? "text-emerald-700"
      : tone === "down"
        ? "text-rose-700"
        : tone === "muted"
          ? "text-app-muted"
          : "text-[#5b6577]";

  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.04)]">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-navy">
        {value}
      </p>
      {hint ? <p className={`mt-1.5 text-xs font-semibold ${hintClass}`}>{hint}</p> : null}
    </div>
  );
}

export function GestaoComercialCards({
  dashboard,
  statusFiltro,
}: {
  dashboard: GestaoComercialDashboard;
  statusFiltro: "ativos" | "encerrados" | "todos";
}) {
  const { comparacao } = dashboard;
  const tone =
    comparacao.tendencia === "alta"
      ? "up"
      : comparacao.tendencia === "baixa"
        ? "down"
        : comparacao.tendencia === "sem_base"
          ? "muted"
          : "neutral";

  const mesLabel = MESES_PT[dashboard.filtrosEfetivos.mesRef - 1] ?? "";
  const filtersStatus = statusFiltro;

  return (
    <section className="space-y-3">
      <p className="text-xs font-medium text-app-muted">
        {GESTAO_COMERCIAL_DISCLAIMER} · Referência: {mesLabel}/
        {dashboard.filtrosEfetivos.anoRef}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          label="Valor fechado no mês"
          value={formatCurrency(dashboard.valorFechado)}
          hint={`${comparacao.label}${
            comparacao.tendencia !== "sem_base"
              ? ` · ${formatComparacaoDiferenca(comparacao)}`
              : ""
          }`}
          tone={tone}
        />
        <Card
          label="Contratos fechados"
          value={String(dashboard.contratosFechados)}
          hint={
            filtersStatus === "ativos"
              ? `Contabilizados (ativos). Encerrados/cancelados no período: ${dashboard.contratosEncerrados}`
              : filtersStatus === "encerrados"
                ? "Somente encerrados/cancelados (fora dos totais ativos)."
                : `Ativos: ${dashboard.contratosAtivos} · Encerrados/cancelados: ${dashboard.contratosEncerrados}`
          }
        />
        <Card
          label="Ticket médio"
          value={formatCurrency(dashboard.ticketMedio)}
        />
        <Card label="Novos clientes" value={String(dashboard.novosClientes)} />
        <Card label="Renovações" value={String(dashboard.renovacoes)} />
        <Card
          label="Contratos encerrados"
          value={String(dashboard.contratosEncerrados)}
          hint="Indicador separado — não compõe valor fechado, ticket nem rankings no filtro Ativos."
          tone="muted"
        />
      </div>
    </section>
  );
}
