"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconChart } from "@/components/ui/icons/OutlineIcons";
import { useRelatoriosPage } from "@/hooks/useRelatoriosPage";
import { useMemo } from "react";
import { RelatoriosContratosSection } from "./RelatoriosContratosSection";
import { RelatoriosEsocialSection } from "./RelatoriosEsocialSection";
import { RelatoriosFinanceiroSection } from "./RelatoriosFinanceiroSection";
import { RelatoriosGlobalFilters } from "./RelatoriosGlobalFilters";
import { RelatoriosOperacionalSection } from "./RelatoriosOperacionalSection";
import { RelatoriosPeriodicosSection } from "./RelatoriosPeriodicosSection";
import { RelatoriosSummaryCards } from "./RelatoriosSummaryCards";

export function RelatoriosPage() {
  const {
    loading,
    error,
    filters,
    filtersExpanded,
    filterOptions,
    kpis,
    pendencias,
    examesRealizados,
    lucratividadeEmpresa,
    lucratividadeClinica,
    esocialSummary,
    esocialEmpresas,
    periodicos,
    contratosRenovacoes,
    contratosVencendo,
    clientesBloqueados,
    chartFaturamento,
    chartExames,
    chartReceitaContratual,
    setFiltersExpanded,
    handleFilterChange,
    handleClearFilters,
  } = useRelatoriosPage();

  const contratosStats = useMemo(() => {
    const ativos = contratosVencendo.filter((c) => c.status === "ativo").length;
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
      ativos,
      vencidos,
      emRenovacao,
      receitaMensal,
      ticketMedio,
    };
  }, [contratosRenovacoes, contratosVencendo]);

  return (
    <AppShell
      title="Relatórios"
      subtitle="Painel gerencial e estratégico — operacional, financeiro, e-Social, periódicos e contratos."
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

            <RelatoriosOperacionalSection
              pendencias={pendencias}
              examesRealizados={examesRealizados}
            />

            <RelatoriosFinanceiroSection
              kpis={kpis}
              lucratividadeEmpresa={lucratividadeEmpresa}
              lucratividadeClinica={lucratividadeClinica}
              chartFaturamento={chartFaturamento}
              chartExames={chartExames}
            />

            <RelatoriosEsocialSection
              summary={esocialSummary}
              empresas={esocialEmpresas}
            />

            <RelatoriosPeriodicosSection periodicos={periodicos} />

            <RelatoriosContratosSection
              kpis={kpis}
              renovacoes={contratosRenovacoes}
              vencendo={contratosVencendo}
              bloqueados={clientesBloqueados}
              chartReceita={chartReceitaContratual}
              contratos={contratosStats}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
