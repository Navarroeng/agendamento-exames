"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconChart } from "@/components/ui/icons/OutlineIcons";
import { useRelatoriosPage } from "@/hooks/useRelatoriosPage";
import { useMemo } from "react";
import { RelatoriosContratosSection } from "./RelatoriosContratosSection";
import { RelatoriosFinanceiroSection } from "./RelatoriosFinanceiroSection";
import { RelatoriosGlobalFilters } from "./RelatoriosGlobalFilters";
import { RelatoriosSummaryCards } from "./RelatoriosSummaryCards";

export function RelatoriosPage() {
  const {
    loading,
    error,
    filters,
    filtersExpanded,
    filterOptions,
    kpis,
    lucratividadeEmpresa,
    lucratividadeClinica,
    contratosRenovacoes,
    contratosVencendo,
    chartFaturamento,
    chartExames,
    chartReceitaContratual,
    setFiltersExpanded,
    handleFilterChange,
    handleClearFilters,
  } = useRelatoriosPage();

  const contratosStats = useMemo(() => {
    const vencidos = contratosVencendo.filter((c) => c.status === "vencido").length;
    const emRenovacao = contratosRenovacoes.filter(
      (c) => c.status === "em_renovacao"
    ).length;
    const valores = contratosRenovacoes
      .filter((c) => c.status === "ativo" && c.valorRenovado != null)
      .map((c) => c.valorRenovado as number);
    const receitaMensal = valores.reduce((s, v) => s + v, 0);
    const ticketMedio =
      valores.length > 0 ? receitaMensal / valores.length : 0;

    return {
      vencidos,
      emRenovacao,
      receitaMensal,
      ticketMedio,
    };
  }, [contratosRenovacoes, contratosVencendo]);

  return (
    <AppShell
      title="Relatórios"
      subtitle="Painel gerencial e estratégico — financeiro e contratos."
      icon={<IconChart size={20} />}
    >
      <div className="space-y-5">
        <RelatoriosGlobalFilters
          filters={filters}
          expanded={filtersExpanded}
          options={filterOptions}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          onToggle={() => setFiltersExpanded((v) => !v)}
        />

        {loading && (
          <p className="py-10 text-center text-sm text-app-muted">
            Carregando indicadores...
          </p>
        )}

        {!loading && error && (
          <p className="py-10 text-center text-sm text-brand-red">{error}</p>
        )}

        {!loading && !error && (
          <>
            <RelatoriosSummaryCards kpis={kpis} />

            <RelatoriosFinanceiroSection
              kpis={kpis}
              lucratividadeEmpresa={lucratividadeEmpresa}
              lucratividadeClinica={lucratividadeClinica}
              chartFaturamento={chartFaturamento}
              chartExames={chartExames}
            />

            <RelatoriosContratosSection
              kpis={kpis}
              renovacoes={contratosRenovacoes}
              vencendo={contratosVencendo}
              chartReceita={chartReceitaContratual}
              contratos={contratosStats}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
