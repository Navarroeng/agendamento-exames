"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import {
  IconCalendar,
  IconEsocial,
  IconFileText,
  IconHome,
  IconShield,
} from "@/components/ui/icons/OutlineIcons";
import { useDashboardPage } from "@/hooks/useDashboardPage";
import { DashboardAgenda } from "./DashboardAgenda";
import { DashboardAtencao } from "./DashboardAtencao";
import { DashboardDocumentacaoSection } from "./DashboardDocumentacaoSection";
import { DashboardEsocialSection } from "./DashboardEsocialSection";
import { DashboardPeriodicosSection } from "./DashboardPeriodicosSection";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { DashboardQuickCharts } from "./DashboardQuickCharts";
import { DashboardSummaryCards } from "./DashboardSummaryCards";

export function DashboardPage() {
  const {
    loading,
    error,
    kpis,
    atencao,
    agenda,
    esocial,
    periodicos,
    documentacao,
    charts,
    agendaFilter,
    setAgendaFilter,
  } = useDashboardPage();

  return (
    <AppShell
      title="Dashboard"
      subtitle="Visão operacional — agenda, pendências, e-Social e periódicos."
      icon={<IconHome size={20} />}
    >
      <div className="space-y-5">
        <DashboardQuickActions />

        {loading && (
          <p className="py-10 text-center text-sm text-app-muted">
            Carregando dashboard...
          </p>
        )}

        {!loading && error && (
          <p className="py-10 text-center text-sm text-brand-red">{error}</p>
        )}

        {!loading && !error && (
          <>
            <DashboardSummaryCards kpis={kpis} />

            <Panel title="Merece Atenção" iconTone="orange">
              <DashboardAtencao cards={atencao} />
            </Panel>

            <Panel
              title="Atividades do Dia"
              icon={<IconCalendar size={16} />}
              iconTone="blue"
            >
              <DashboardAgenda
                rows={agenda}
                filter={agendaFilter}
                onFilterChange={setAgendaFilter}
              />
            </Panel>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Panel
                title="e-Social"
                icon={<IconEsocial size={16} />}
                iconTone="blue"
              >
                {esocial && (
                  <DashboardEsocialSection
                    summary={esocial.summary}
                    rows={esocial.rows}
                  />
                )}
              </Panel>

              <Panel
                title="Periódicos Futuros"
                icon={<IconShield size={16} />}
                iconTone="purple"
              >
                {periodicos && (
                  <DashboardPeriodicosSection
                    summary={periodicos.summary}
                    rows={periodicos.rows}
                  />
                )}
              </Panel>
            </div>

            <Panel
              title="Documentação"
              icon={<IconFileText size={16} />}
              iconTone="green"
            >
              {documentacao && (
                <DashboardDocumentacaoSection counts={documentacao} />
              )}
            </Panel>

            <Panel title="Indicadores operacionais" iconTone="blue">
              <DashboardQuickCharts charts={charts} />
            </Panel>
          </>
        )}
      </div>
    </AppShell>
  );
}
