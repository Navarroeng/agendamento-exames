"use client";

import { formatCurrency } from "@/lib/money";
import {
  formatComparacaoDiferenca,
  GESTAO_COMERCIAL_DISCLAIMER,
  labelOrigemGestaoComercial,
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
  const { comparacao, indicadoresDetalhadosDisponiveis } = dashboard;
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
  const origemLabel = labelOrigemGestaoComercial(dashboard.origemValorPeriodo);
  const semDados = "Sem dados";

  return (
    <section className="space-y-3">
      <p className="text-xs font-medium text-app-muted">
        {GESTAO_COMERCIAL_DISCLAIMER} · Referência: {mesLabel}/
        {dashboard.filtrosEfetivos.anoRef}
        {dashboard.origemValorPeriodo
          ? ` · Origem: ${origemLabel}`
          : ""}
      </p>
      {!indicadoresDetalhadosDisponiveis && dashboard.mensagemDetalhesIndisponiveis ? (
        <p className="rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs font-semibold text-[#92400e]">
          {dashboard.mensagemDetalhesIndisponiveis}
        </p>
      ) : null}
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
          value={
            indicadoresDetalhadosDisponiveis
              ? String(dashboard.contratosFechados)
              : semDados
          }
          hint={
            !indicadoresDetalhadosDisponiveis
              ? dashboard.mensagemDetalhesIndisponiveis ?? undefined
              : filtersStatus === "ativos"
                ? `Contabilizados (ativos). Encerrados/cancelados no período: ${dashboard.contratosEncerrados}`
                : filtersStatus === "encerrados"
                  ? "Somente encerrados/cancelados (fora dos totais ativos)."
                  : `Ativos: ${dashboard.contratosAtivos} · Encerrados/cancelados: ${dashboard.contratosEncerrados}`
          }
          tone={!indicadoresDetalhadosDisponiveis ? "muted" : undefined}
        />
        <Card
          label="Ticket médio"
          value={
            indicadoresDetalhadosDisponiveis
              ? formatCurrency(dashboard.ticketMedio)
              : semDados
          }
          tone={!indicadoresDetalhadosDisponiveis ? "muted" : undefined}
        />
        <Card
          label="Novos clientes"
          value={
            indicadoresDetalhadosDisponiveis
              ? String(dashboard.novosClientes)
              : semDados
          }
          tone={!indicadoresDetalhadosDisponiveis ? "muted" : undefined}
        />
        <Card
          label="Renovações"
          value={
            indicadoresDetalhadosDisponiveis
              ? String(dashboard.renovacoes)
              : semDados
          }
          tone={!indicadoresDetalhadosDisponiveis ? "muted" : undefined}
        />
        <Card
          label="Contratos encerrados"
          value={
            indicadoresDetalhadosDisponiveis
              ? String(dashboard.contratosEncerrados)
              : semDados
          }
          hint={
            indicadoresDetalhadosDisponiveis
              ? "Indicador separado — não compõe valor fechado, ticket nem rankings no filtro Ativos."
              : dashboard.mensagemDetalhesIndisponiveis ?? undefined
          }
          tone="muted"
        />
      </div>
    </section>
  );
}
