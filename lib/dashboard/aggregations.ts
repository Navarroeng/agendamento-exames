import {
  ESOCIAL_VISUAL_STATUS_LABELS,
  getESocialVisualStatus,
} from "@/lib/esocial-filters";
import { formatDateBR } from "@/lib/format";
import { isPeriodicoCanceladoManualmente } from "@/lib/periodico-cancelamento";
import {
  computePeriodicoDisplayStatus,
  isPeriodicoActionable,
  periodicoDisplayStatusLabel,
  toPeriodicoFuturoRow,
} from "@/lib/periodicos-futuro";
import { textsMatchSearch } from "@/lib/text-normalize";
import type {
  AgendamentoWithExames,
  PeriodicoFuturoRecord,
  PeriodicoFuturoRow,
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
  DashboardKpiDetailRow,
  DashboardKpiKey,
  DashboardKpiStatusTone,
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

export interface DashboardKpiLists {
  pendenciasEsocial: AgendamentoWithExames[];
  asosNaoRecebidosClinicas: AgendamentoWithExames[];
  asosNaoEnviadosClientes: AgendamentoWithExames[];
  periodicosVencidos: PeriodicoFuturoRow[];
  periodicosVencendoMesAtual: PeriodicoFuturoRow[];
  agendamentosDoDia: AgendamentoWithExames[];
}

function sortAgendamentos(
  rows: AgendamentoWithExames[]
): AgendamentoWithExames[] {
  return [...rows].sort((a, b) => {
    const dateCmp = toIsoDate(a.data_agendamento).localeCompare(
      toIsoDate(b.data_agendamento)
    );
    if (dateCmp !== 0) return dateCmp;
    const hora = (a.horario ?? "").localeCompare(b.horario ?? "");
    if (hora !== 0) return hora;
    return a.colaborador.localeCompare(b.colaborador, "pt-BR");
  });
}

function sortPeriodicos(rows: PeriodicoFuturoRow[]): PeriodicoFuturoRow[] {
  return [...rows].sort((a, b) => {
    const dateCmp = toIsoDate(a.proxima_data).localeCompare(
      toIsoDate(b.proxima_data)
    );
    if (dateCmp !== 0) return dateCmp;
    const nome = a.colaborador.localeCompare(b.colaborador, "pt-BR");
    if (nome !== 0) return nome;
    return (a.exame_nome || a.tipo_exame).localeCompare(
      b.exame_nome || b.tipo_exame,
      "pt-BR"
    );
  });
}

/**
 * Listas que alimentam os KPIs do Dashboard.
 * As regras de competência são as mesmas dos indicadores.
 */
export function buildDashboardKpiLists(
  agendamentos: AgendamentoWithExames[],
  periodicos: PeriodicoFuturoRecord[],
  now: DashboardNow = new Date()
): DashboardKpiLists {
  const { inicioMesAtual, fimMesAtual, hojeIso } = getDashboardMonthBounds(now);
  const active = activeAgendamentos(agendamentos);
  const periodicoRows = actionablePeriodicos(periodicos);

  const anteriores = (dataIso: string) =>
    isCompetenciaMesesAnteriores(dataIso, inicioMesAtual);

  return {
    pendenciasEsocial: sortAgendamentos(
      active.filter((a) => {
        if (!anteriores(a.data_agendamento)) return false;
        return isEsocialPendente(a);
      })
    ),
    asosNaoRecebidosClinicas: sortAgendamentos(
      active.filter((a) => {
        if (!anteriores(a.data_agendamento)) return false;
        return !a.aso_assinado;
      })
    ),
    asosNaoEnviadosClientes: sortAgendamentos(
      active.filter((a) => {
        if (!anteriores(a.data_agendamento)) return false;
        return !a.aso_enviado_cliente;
      })
    ),
    periodicosVencidos: sortPeriodicos(
      periodicoRows.filter((p) => anteriores(p.proxima_data))
    ),
    periodicosVencendoMesAtual: sortPeriodicos(
      periodicoRows.filter((p) =>
        isCompetenciaMesAtual(p.proxima_data, inicioMesAtual, fimMesAtual)
      )
    ),
    agendamentosDoDia: sortAgendamentos(
      active.filter((a) => toIsoDate(a.data_agendamento) === hojeIso)
    ),
  };
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
  const lists = buildDashboardKpiLists(agendamentos, periodicos, now);
  return {
    pendenciasEsocial: lists.pendenciasEsocial.length,
    asosNaoRecebidosClinicas: lists.asosNaoRecebidosClinicas.length,
    asosNaoEnviadosClientes: lists.asosNaoEnviadosClientes.length,
    periodicosVencidos: lists.periodicosVencidos.length,
    periodicosVencendoMesAtual: lists.periodicosVencendoMesAtual.length,
    agendamentosDoDia: lists.agendamentosDoDia.length,
  };
}

function mapAgendamentoRow(
  agendamento: AgendamentoWithExames,
  extras: Pick<DashboardKpiDetailRow, "status" | "statusTone">
): DashboardKpiDetailRow {
  const dataIso = toIsoDate(agendamento.data_agendamento);
  return {
    id: agendamento.id,
    colaborador: agendamento.colaborador,
    empresa: agendamento.cliente_nome,
    dataIso,
    dataLabel: formatDateBR(dataIso),
    horario: agendamento.horario?.trim() || "—",
    clinica: agendamento.clinica_nome?.trim() || "—",
    tipoAso: agendamento.aso,
    exame: "—",
    status: extras.status,
    statusTone: extras.statusTone,
  };
}

function periodicoStatusTone(
  status: ReturnType<typeof computePeriodicoDisplayStatus>
): DashboardKpiStatusTone {
  if (status === "vencido") return "overdue";
  if (status === "vence_30_dias") return "pending";
  if (status === "em_dia") return "active";
  if (status === "reagendado") return "active";
  return "cancelled";
}

function mapPeriodicoRow(
  record: PeriodicoFuturoRow,
  hojeIso: string
): DashboardKpiDetailRow {
  const dataIso = toIsoDate(record.proxima_data);
  const display = computePeriodicoDisplayStatus(record, hojeIso);
  return {
    id: record.id,
    colaborador: record.colaborador,
    empresa: record.cliente_nome,
    dataIso,
    dataLabel: formatDateBR(dataIso),
    horario: "—",
    clinica: "—",
    tipoAso: record.tipo_aso?.trim() || "Periódico",
    exame: record.exame_nome || record.tipo_exame || "—",
    status: periodicoDisplayStatusLabel(display),
    statusTone: periodicoStatusTone(display),
  };
}

export function buildDashboardKpiDetailRows(
  key: DashboardKpiKey,
  agendamentos: AgendamentoWithExames[],
  periodicos: PeriodicoFuturoRecord[],
  now: DashboardNow = new Date()
): DashboardKpiDetailRow[] {
  const { hojeIso } = getDashboardMonthBounds(now);
  const lists = buildDashboardKpiLists(agendamentos, periodicos, now);

  if (key === "pendenciasEsocial") {
    return lists.pendenciasEsocial.map((a) => {
      const visual = getESocialVisualStatus(a);
      return mapAgendamentoRow(a, {
        status: ESOCIAL_VISUAL_STATUS_LABELS[visual],
        statusTone: visual === "urgente" ? "overdue" : "pending",
      });
    });
  }

  if (key === "asosNaoRecebidosClinicas") {
    return lists.asosNaoRecebidosClinicas.map((a) =>
      mapAgendamentoRow(a, agendaStatus(a, hojeIso))
    );
  }

  if (key === "asosNaoEnviadosClientes") {
    return lists.asosNaoEnviadosClientes.map((a) =>
      mapAgendamentoRow(a, {
        status: "Não enviado",
        statusTone: "pending",
      })
    );
  }

  if (key === "periodicosVencidos") {
    return lists.periodicosVencidos.map((p) => mapPeriodicoRow(p, hojeIso));
  }

  if (key === "periodicosVencendoMesAtual") {
    return lists.periodicosVencendoMesAtual.map((p) =>
      mapPeriodicoRow(p, hojeIso)
    );
  }

  return lists.agendamentosDoDia.map((a) =>
    mapAgendamentoRow(a, agendaStatus(a, hojeIso))
  );
}

export function filterDashboardKpiRowsBySearch(
  rows: DashboardKpiDetailRow[],
  query: string
): DashboardKpiDetailRow[] {
  return rows.filter((row) =>
    textsMatchSearch([row.colaborador, row.empresa], query)
  );
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
      const dateCmp = a.dataIso.localeCompare(b.dataIso);
      if (dateCmp !== 0) return dateCmp;
      return (a.horario ?? "").localeCompare(b.horario ?? "");
    });
}
