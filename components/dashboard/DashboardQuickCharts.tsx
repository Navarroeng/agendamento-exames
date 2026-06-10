import { RelatoriosChartCard } from "@/components/relatorios/RelatoriosChartCard";
import type { DashboardCharts } from "@/lib/dashboard/types";

interface DashboardQuickChartsProps {
  charts: DashboardCharts | null;
}

export function DashboardQuickCharts({ charts }: DashboardQuickChartsProps) {
  if (!charts) return null;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <RelatoriosChartCard
        title="Agendamentos por dia"
        data={charts.agendamentosPorDia}
        type="line"
        height={180}
      />
      <RelatoriosChartCard
        title="ASOs por tipo"
        data={charts.asosPorTipo}
        type="bar"
        height={180}
      />
      <RelatoriosChartCard
        title="Pendências e-Social"
        data={charts.pendenciasEsocial}
        type="bar"
        height={180}
      />
      <RelatoriosChartCard
        title="Periódicos vencendo"
        data={charts.periodicosVencendo}
        type="bar"
        height={180}
      />
    </div>
  );
}
