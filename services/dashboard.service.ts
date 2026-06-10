import { listarAgendamentosComExames } from "@/services/agendamento.service";
import { listarPeriodicosFuturos } from "@/services/periodico-futuro.service";
import type { AgendamentoWithExames, PeriodicoFuturoRecord } from "@/lib/types";

export interface DashboardData {
  agendamentos: AgendamentoWithExames[];
  periodicos: PeriodicoFuturoRecord[];
}

export async function carregarDadosDashboard(): Promise<DashboardData> {
  const [agendamentos, periodicos] = await Promise.all([
    listarAgendamentosComExames(2000),
    listarPeriodicosFuturos(2000),
  ]);

  return { agendamentos, periodicos };
}
