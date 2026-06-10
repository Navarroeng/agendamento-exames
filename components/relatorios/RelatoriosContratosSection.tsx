"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/money";
import { labelClienteContratoStatus } from "@/lib/cliente-contrato-mappers";
import type {
  ChartPoint,
  ClienteBloqueadoRow,
  ContratoRenovacaoRow,
  ContratoVencendoRow,
  RelatoriosKpis,
} from "@/lib/relatorios/types";
import { RelatoriosChartCard } from "./RelatoriosChartCard";
import { RelatoriosDataTable } from "./RelatoriosDataTable";
import { RelatoriosExportButtons } from "./RelatoriosExportButtons";
import { RelatoriosSection } from "./RelatoriosSection";

function vencimentoStatusLabel(
  status: ContratoVencendoRow["status"]
): string {
  if (status === "vencido") return "Vencido";
  if (status === "vence_30") return "Vence em 30 dias";
  if (status === "vence_60") return "Vence em 60 dias";
  return "Ativo";
}

interface RelatoriosContratosSectionProps {
  kpis: RelatoriosKpis | null;
  renovacoes: ContratoRenovacaoRow[];
  vencendo: ContratoVencendoRow[];
  bloqueados: ClienteBloqueadoRow[];
  chartReceita: ChartPoint[];
  contratos: {
    vencidos: number;
    emRenovacao: number;
    receitaMensal: number;
    ticketMedio: number;
  };
}

export function RelatoriosContratosSection({
  kpis,
  renovacoes,
  vencendo,
  bloqueados,
  chartReceita,
  contratos,
}: RelatoriosContratosSectionProps) {
  const renovacaoRows = renovacoes.map((r) => [
    r.empresa,
    r.inicio,
    r.fim,
    r.valorAnterior != null ? formatCurrency(r.valorAnterior) : "—",
    r.valorRenovado != null ? formatCurrency(r.valorRenovado) : "—",
    r.reajustePercentual != null ? `${r.reajustePercentual}%` : "—",
    r.colaboradores ?? "—",
    labelClienteContratoStatus(r.status),
    r.responsavel,
  ]);

  const vencendoRows = vencendo.map((r) => [
    r.empresa,
    r.vencimento,
    String(r.diasRestantes),
    r.valorContrato != null ? formatCurrency(r.valorContrato) : "—",
    r.colaboradores ?? "—",
    vencimentoStatusLabel(r.status),
    <Link
      key={r.id}
      href="/clientes"
      className="text-[10px] font-bold text-brand-blue"
    >
      Abrir cliente
    </Link>,
  ]);

  const bloqueadosRows = bloqueados.map((r) => [
    r.empresa,
    r.motivo,
    r.vencimentoContrato,
    r.ultimoAgendamento,
    r.responsavel,
  ]);

  return (
    <RelatoriosSection
      title="Contratos e renovações"
      subtitle="Painel gerencial de contratos, vencimentos e clientes bloqueados."
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Ativos", value: kpis?.contratosAtivos ?? 0 },
          { label: "Vencidos", value: contratos.vencidos },
          { label: "Vencendo 30d", value: kpis?.contratosVencendo ?? 0 },
          { label: "Em renovação", value: contratos.emRenovacao },
          { label: "Receita mensal", value: formatCurrency(contratos.receitaMensal) },
          {
            label: "Receita anual",
            value: formatCurrency(kpis?.receitaContratualAnual ?? 0),
          },
          { label: "Ticket médio", value: formatCurrency(contratos.ticketMedio) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#e8edf5] bg-white px-3 py-3"
          >
            <p className="text-[10px] font-bold uppercase text-[#8b95a8]">
              {card.label}
            </p>
            <p className="mt-1 text-sm font-extrabold text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      <RelatoriosChartCard
        title="Evolução de receita contratual"
        data={chartReceita}
        type="line"
      />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-navy">Renovações</h4>
          <RelatoriosExportButtons
            title="Renovações de contratos"
            filenameBase="contratos-renovacoes"
            headers={[
              "Empresa",
              "Início",
              "Fim",
              "Valor anterior",
              "Valor renovado",
              "Reajuste %",
              "Colaboradores",
              "Status",
              "Responsável",
            ]}
            rows={renovacaoRows.map((r) => r.map(String))}
          />
        </div>
        <RelatoriosDataTable
          headers={[
            "Empresa",
            "Início",
            "Fim",
            "Valor ant.",
            "Valor renov.",
            "Reajuste",
            "Colab.",
            "Status",
            "Resp.",
          ]}
          rows={renovacaoRows}
          maxHeight="300px"
        />
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold text-navy">Contratos vencendo</h4>
        <RelatoriosDataTable
          headers={[
            "Empresa",
            "Vencimento",
            "Dias",
            "Valor",
            "Colab.",
            "Status",
            "Ações",
          ]}
          rows={vencendoRows}
        />
      </div>

      <div>
        <h4 className="mb-3 text-sm font-bold text-navy">Clientes bloqueados</h4>
        <RelatoriosDataTable
          headers={[
            "Empresa",
            "Motivo",
            "Vencimento",
            "Último agendamento",
            "Responsável",
          ]}
          rows={bloqueadosRows}
        />
      </div>
    </RelatoriosSection>
  );
}
