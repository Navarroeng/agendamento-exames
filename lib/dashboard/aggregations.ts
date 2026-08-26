import { getESocialVisualStatus } from "@/lib/esocial-filters";
import {
  isPeriodicoActionable,
  toPeriodicoFuturoRow,
} from "@/lib/periodicos-futuro";
import { isPeriodicoCanceladoManualmente } from "@/lib/periodico-cancelamento";
import type {
  AgendamentoWithExames,
  PeriodicoFuturoRecord,
} from "@/lib/types";
import {
  addCalendarDaysIso,
  getDashboardMonthBounds,
  isCompetenciaMesAtual,
  isCompetenciaMesesAnteriores,
  toIsoDate,
  type DashboardNow,
} from "./month-bounds";
import type {
  DashboardAgendaFilter,
  DashboardAgendaRow,
  DashboardKpis,
} from "./types";

function weekRangeIso(hoje: string): { inicio: string; fim: string } {
  const [year, month, day] = hoje.split("-").map(Number);
  const now = new Date(year, month - 1, day);
  const weekday = now.getDay();
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  return {
    inicio: addCalendarDaysIso(hoje, diffToMonday),
    fim: addCalendarDaysIso(hoje, diffToMonday + 6),
  };
}

function activeAgendamentos(agendamentos: AgendamentoWithExames[]) {
  return agendamentos.filter((a) => a.status !== "cancelado");
}

function actionablePeriodicos(periodicos: PeriodicoFuturoRecord[]) {
  return periodicos
    .filter((p) => {
      if (isPeriodicoCanceladoManualmente(p)) return false;
      if (p.status === "reagendado") return false;
      return isPeriodicoActionable(p.status) || p.status === "cancelado";
    })
    .map(toPeriodicoFuturoRow);
}

function agendaStatus(
  agendamento: AgendamentoWithExames,
  hoje: string
): Pick<DashboardAgendaRow, "status" | "statusTone"> {
  const data = toIsoDate(agendamento.data_agendamento);

  if (agendamento.status === "rascunho") {
    return { status: "Rascunho", statusTone: "draft" };
  }
  if (data < hoje) {
    return { status: "Atrasado", statusTone: "overdue" };
  }
  if (agendamento.status === "agendado") {
    return { status: "Agendado", statusTone: "active" };
  }
  if (agendamento.status === "aso_retido") {
    return { status: "ASO Retido", statusTone: "pending" };
  }
  return { status: "Pendente", statusTone: "pending" };
}

function isEsocialPendente(agendamento: AgendamentoWithExames): boolean {
  const status = getESocialVisualStatus(agendamento);
  return status === "pendente" || status === "urgente";
}

/**
 * KPIs do Dashboard.
 *
 * Data de competência:
 * - e-Social / ASO clínica / ASO cliente → `data_agendamento`
 * - periódicos → `proxima_data`
 *
 * Meses anteriores: data < início do mês atual.
 * Mês atual: início ≤ data ≤ fim do mês atual.
 */
export function buildDashboardKpis(
  agendamentos: AgendamentoWithExames[],
  periodicos: PeriodicoFuturoRecord[],
  now: DashboardNow = new Date()
): DashboardKpis {
  const { inicioMesAtual, fimMesAtual, hojeIso } = getDashboardMonthBounds(now);
  const active = activeAgendamentos(agendamentos);
  const periodicoRows = actionablePeriodicos(periodicos);

  const anteriores = (dataIso: string) =>
    isCompetenciaMesesAnteriores(dataIso, inicioMesAtual);

  const pendenciasEsocial = active.filter((a) => {
    if (!anteriores(a.data_agendamento)) return false;
    return isEsocialPendente(a);
  }).length;

  const asosNaoRecebidosClinicas = active.filter((a) => {
    if (!anteriores(a.data_agendamento)) return false;
    return !a.aso_assinado;
  }).length;

  const asosNaoEnviadosClientes = active.filter((a) => {
    if (!anteriores(a.data_agendamento)) return false;
    return !a.aso_enviado_cliente;
  }).length;

  const periodicosVencidos = periodicoRows.filter((p) =>
    anteriores(p.proxima_data)
  ).length;

  const periodicosVencendoMesAtual = periodicoRows.filter((p) =>
    isCompetenciaMesAtual(p.proxima_data, inicioMesAtual, fimMesAtual)
  ).length;

  const agendamentosDoDia = active.filter(
    (a) => toIsoDate(a.data_agendamento) === hojeIso
  ).length;

  return {
    pendenciasEsocial,
    asosNaoRecebidosClinicas,
    asosNaoEnviadosClientes,
    periodicosVencidos,
    periodicosVencendoMesAtual,
    agendamentosDoDia,
  };
}

export function buildDashboardAgenda(
  agendamentos: AgendamentoWithExames[],
  filter: DashboardAgendaFilter,
  now: DashboardNow = new Date()
): DashboardAgendaRow[] {
  const { hojeIso } = getDashboardMonthBounds(now);
  const amanha = addCalendarDaysIso(hojeIso, 1);
  const semana = weekRangeIso(hojeIso);

  return activeAgendamentos(agendamentos)
    .filter((a) => {
      const data = toIsoDate(a.data_agendamento);
      if (filter === "hoje") return data === hojeIso;
      if (filter === "amanha") return data === amanha;
      if (filter === "atrasados") return data < hojeIso;
      return data >= semana.inicio && data <= semana.fim;
    })
    .map((a) => {
      const { status, statusTone } = agendaStatus(a, hojeIso);
      return {
        id: a.id,
        colaborador: a.colaborador,
        empresa: a.cliente_nome,
        tipoAso: a.aso,
        horario: a.horario ?? "—",
        clinica: a.clinica_nome,
        status,
        statusTone,
        dataIso: toIsoDate(a.data_agendamento),
      };
    })
    .sort((a, b) => {
      if (filter === "atrasados") {
        return b.dataIso.localeCompare(a.dataIso);
      }
      const dateCmp = a.dataIso.localeCompare(b.dataIso);
      if (dateCmp !== 0) return dateCmp;
      return (a.horario ?? "").localeCompare(b.horario ?? "");
    });
}
