"use client";

import { AppShell } from "@/components/layout/AppShell";
import { IconChart } from "@/components/ui/icons/OutlineIcons";
import { GestaoComercialBreakdowns } from "@/components/gestao-comercial/GestaoComercialBreakdowns";
import { GestaoComercialCards } from "@/components/gestao-comercial/GestaoComercialCards";
import { GestaoComercialEvolucaoChart } from "@/components/gestao-comercial/GestaoComercialEvolucaoChart";
import { GestaoComercialFiltersBar } from "@/components/gestao-comercial/GestaoComercialFiltersBar";
import { GestaoComercialTabela } from "@/components/gestao-comercial/GestaoComercialTabela";
import { useGestaoComercialPage } from "@/hooks/useGestaoComercialPage";

export function GestaoComercialPage() {
  const {
    loading,
    error,
    forbidden,
    filters,
    dashboard,
    responsaveisOptions,
    anosOptions,
    origemOptions,
    handleFilterChange,
    handleClearFilters,
  } = useGestaoComercialPage();

  return (
    <AppShell
      title="Gestão Comercial"
      subtitle="Resultados dos contratos fechados pela Navarro (valor contratado, não recebido)."
      icon={<IconChart />}
    >
      <div className="space-y-5">
        {forbidden ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
            Acesso restrito a administradores.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {!forbidden ? (
          <>
            <GestaoComercialFiltersBar
              filters={filters}
              anosOptions={anosOptions}
              responsaveisOptions={responsaveisOptions}
              origemOptions={origemOptions}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
            />

            {loading ? (
              <p className="text-sm text-app-muted">Carregando…</p>
            ) : (
              <>
                <GestaoComercialCards dashboard={dashboard} />
                <GestaoComercialEvolucaoChart
                  data={dashboard.serieMensalAno}
                  ano={filters.ano}
                />
                <GestaoComercialBreakdowns dashboard={dashboard} />
                <GestaoComercialTabela rows={dashboard.rows} />
              </>
            )}
          </>
        ) : null}
      </div>
    </AppShell>
  );
}
