import {
  addCalendarDaysIso,
  getDashboardMonthBounds,
} from "@/lib/dashboard/month-bounds";
import { lerTodosOsLotes } from "@/lib/consulta-lotes";
import { createClient } from "@/lib/supabase/client";
import { listarPeriodicosFuturos } from "@/services/periodico-futuro.service";
import type { AgendamentoWithExames, PeriodicoFuturoRecord } from "@/lib/types";

export interface DashboardData {
  agendamentos: AgendamentoWithExames[];
  periodicos: PeriodicoFuturoRecord[];
}

function fimExclusivoAgenda(hojeIso: string): string {
  const [year, month, day] = hojeIso.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addCalendarDaysIso(hojeIso, diffToMonday + 7);
}

/**
 * KPIs usam meses anteriores e o mês atual; a agenda usa a semana corrente.
 * A leitura percorre esses intervalos inteiros, sem teto de registros.
 */
export async function carregarDadosDashboard(): Promise<DashboardData> {
  const { hojeIso, fimMesAtual } = getDashboardMonthBounds();
  const fimAgenda = fimExclusivoAgenda(hojeIso);
  const fimPeriodicos = addCalendarDaysIso(fimMesAtual, 1);
  const fimAgendamentos = fimAgenda > fimPeriodicos ? fimAgenda : fimPeriodicos;
  const supabase = createClient();

  const [agendamentos, periodicos] = await Promise.all([
    lerTodosOsLotes(async (from, to) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .neq("status", "cancelado")
        .lt("data_agendamento", fimAgendamentos)
        .order("data_agendamento", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as AgendamentoWithExames[];
    }),
    listarPeriodicosFuturos({ proximaDataAntesDe: fimPeriodicos }),
  ]);

  return { agendamentos, periodicos };
}
