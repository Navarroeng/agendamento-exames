"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Panel } from "@/components/ui/Panel";
import { IconCalendar, IconHome } from "@/components/ui/icons/OutlineIcons";
import { useDashboardPage } from "@/hooks/useDashboardPage";
import { DashboardAgenda } from "./DashboardAgenda";
import { DashboardQuickActions } from "./DashboardQuickActions";
import { DashboardSummaryCards } from "./DashboardSummaryCards";

export function DashboardPage() {
  const { loading, error, kpis, agenda, agendaFilter, setAgendaFilter } =
    useDashboardPage();

  return (
    <AppShell
      title="Dashboard"
      subtitle="Visão operacional — pendências anteriores e acompanhamento do mês."
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
          </>
        )}
      </div>
    </AppShell>
  );
}
