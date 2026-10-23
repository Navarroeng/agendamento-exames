"use client";

import { useState } from "react";
import { GestaoComercialMensalidadesModal } from "@/components/gestao-comercial/GestaoComercialMensalidadesModal";
import { formatCurrency } from "@/lib/money";
import {
  formatComparacaoDiferenca,
  GESTAO_COMERCIAL_DISCLAIMER,
  labelOrigemGestaoComercial,
  MESES_PT,
  type GestaoComercialDashboard,
} from "@/lib/gestao-comercial";
import type { ResumoMensalidadesPrevistas } from "@/lib/gestao-comercial-mensalidades";

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

function CardMensalidades({
  resumo,
  onOpen,
}: {
  resumo: ResumoMensalidadesPrevistas;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-2xl border border-[#e8edf5] bg-white p-4 text-left shadow-[0_4px_18px_rgba(15,23,42,0.04)] transition hover:border-[#c5d4ea] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4e89]"
      aria-haspopup="dialog"
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8b95a8]">
        Mensalidades previstas — {resumo.periodoLabel}
      </p>
      <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-navy">
        {resumo.disponivel ? formatCurrency(resumo.valor) : "Sem dados"}
      </p>
      <p className="mt-1.5 text-xs font-semibold text-[#5b6577]">
        {resumo.disponivel
          ? resumo.contratosLabel
          : resumo.mensagemIndisponivel}
      </p>
      <p className="mt-1 text-[11px] font-medium text-app-muted">
        Por vencimento da mensalidade · inclui pagas e em aberto
      </p>
      {resumo.disponivel && resumo.pendencias > 0 ? (
        <p className="mt-1 text-[11px] font-semibold text-[#92400e]">
          {resumo.pendencias === 1
            ? "1 contratação sem dados para calcular as parcelas"
            : `${resumo.pendencias} contratações sem dados para calcular as parcelas`}
        </p>
      ) : null}
    </button>
  );
}

export function GestaoComercialCards({
  dashboard,
  statusFiltro,
  mensalidades,
}: {
  dashboard: GestaoComercialDashboard;
  statusFiltro: "ativos" | "encerrados" | "todos";
  mensalidades: ResumoMensalidadesPrevistas;
}) {
  const [mensalidadesAbertas, setMensalidadesAbertas] = useState(false);
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
        <CardMensalidades
          resumo={mensalidades}
          onOpen={() => setMensalidadesAbertas(true)}
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
      <GestaoComercialMensalidadesModal
        open={mensalidadesAbertas}
        onClose={() => setMensalidadesAbertas(false)}
        resumo={mensalidades}
      />
    </section>
  );
}
