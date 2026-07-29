import { parseMonthYearBRToIsoRange } from "@/lib/agendamento-datetime";
import {
  computeESocialSummary,
  filterAgendamentosESocial,
  getESocialVisualStatus,
} from "@/lib/esocial-filters";
import { orderESocialForTable } from "@/lib/esocial-table-sort";
import { formatDateBR } from "@/lib/format";
import {
  isPeriodicoActionable,
  toPeriodicoFuturoRow,
} from "@/lib/periodicos-futuro";
import { currentMonthReferenciaBR } from "@/lib/relatorios/filters";
import type {
  AgendamentoWithExames,
  PeriodicoFuturoRecord,
} from "@/lib/types";
import type {
  DashboardAgendaFilter,
  DashboardAgendaRow,
  DashboardAtencaoCard,
  DashboardCharts,
  DashboardDocumentacaoCounts,
  DashboardEsocialRow,
  DashboardEsocialSummary,
  DashboardKpis,
  DashboardPeriodicosRow,
  DashboardPeriodicosSummary,
} from "./types";

const PRIORITY_ORDER = { alta: 0, media: 1, baixa: 2 } as const;

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function weekRangeIso(): { inicio: string; fim: string } {
  const hoje = todayIso();
  const now = new Date(`${hoje}T12:00:00`);
  const day = now.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    inicio: monday.toISOString().split("T")[0],
    fim: sunday.toISOString().split("T")[0],
  };
}

function activeAgendamentos(agendamentos: AgendamentoWithExames[]) {
  return agendamentos.filter((a) => a.status !== "cancelado");
}

function currentMonthRange() {
  return parseMonthYearBRToIsoRange(currentMonthReferenciaBR());
}

function actionablePeriodicos(periodicos: PeriodicoFuturoRecord[]) {
  return periodicos
    .filter((p) => isPeriodicoActionable(p.status))
    .map(toPeriodicoFuturoRow);
}

function agendaStatus(
  agendamento: AgendamentoWithExames,
  hoje: string
): Pick<DashboardAgendaRow, "status" | "statusTone"> {
  const data = agendamento.data_agendamento.split("T")[0];

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

export function buildDashboardKpis(
  agendamentos: AgendamentoWithExames[],
  periodicos: PeriodicoFuturoRecord[]
): DashboardKpis {
  const hoje = todayIso();
  const range = currentMonthRange();
  const active = activeAgendamentos(agendamentos);
  const periodicoRows = actionablePeriodicos(periodicos);

  const agendamentosDoDia = active.filter(
    (a) => a.data_agendamento.split("T")[0] === hoje
  ).length;

  const pendenciasEsocial = active.filter((a) => {
    const status = getESocialVisualStatus(a);
    return status === "pendente" || status === "urgente";
  }).length;

  const asosPendentesAssinatura = active.filter((a) => !a.aso_assinado).length;

  const asosPendentesEnvioCliente = active.filter(
    (a) => !a.aso_enviado_cliente
  ).length;

  const periodicosVencendo30Dias = periodicoRows.filter(
    (p) => p.displayStatus === "vence_30_dias"
  ).length;

  const periodicosVencidos = periodicoRows.filter(
    (p) => p.displayStatus === "vencido"
  ).length;

  const agendamentosPendentesClinica = active.filter(
    (a) => !a.aso_enviado_clinica
  ).length;

  const inMonth = (dataIso: string) =>
    !range || (dataIso >= range.inicio && dataIso <= range.fim);

  const mesAgendamentos = active.filter((a) =>
    inMonth(a.data_agendamento.split("T")[0])
  );

  const examesRealizadosMes = mesAgendamentos.filter(
    (a) => a.data_agendamento.split("T")[0] <= hoje
  ).length;

  const totalAsosMes = mesAgendamentos.length;

  return {
    agendamentosDoDia,
    pendenciasEsocial,
    asosPendentesAssinatura,
    asosPendentesEnvioCliente,
    periodicosVencendo30Dias,
    periodicosVencidos,
    agendamentosPendentesClinica,
    examesRealizadosMes,
    totalAsosMes,
  };
}

export function buildDashboardAtencao(
  agendamentos: AgendamentoWithExames[],
  periodicos: PeriodicoFuturoRecord[]
): DashboardAtencaoCard[] {
  const hoje = todayIso();
  const active = activeAgendamentos(agendamentos);
  const periodicoRows = actionablePeriodicos(periodicos);

  const periodicosVencendoMes = periodicoRows.filter((p) => {
    const proxima = p.proxima_data.split("T")[0];
    const mesAtual = hoje.slice(0, 7);
    return proxima.slice(0, 7) === mesAtual && proxima >= hoje;
  }).length;

  const asosSemAssinatura = active.filter((a) => !a.aso_assinado).length;

  const esocialUrgente = active.filter(
    (a) => getESocialVisualStatus(a) === "urgente"
  ).length;

  const aguardandoClinica = active.filter((a) => !a.aso_enviado_clinica).length;

  const cards: DashboardAtencaoCard[] = [
    {
      id: "periodicos-mes",
      priority: periodicosVencendoMes > 0 ? "alta" : "baixa",
      title: "Periódicos vencendo este mês",
      count: periodicosVencendoMes,
      description: "Renovações com vencimento no mês corrente",
      href: "/periodicos-futuros",
    },
    {
      id: "asos-assinatura",
      priority: asosSemAssinatura > 5 ? "alta" : asosSemAssinatura > 0 ? "media" : "baixa",
      title: "ASOs sem assinatura",
      count: asosSemAssinatura,
      description: "Documentos aguardando assinatura",
      href: "/exames",
    },
    {
      id: "esocial-urgente",
      priority: esocialUrgente > 0 ? "alta" : "baixa",
      title: "e-Social +30 dias",
      count: esocialUrgente,
      description: "Envios pendentes há mais de 30 dias",
      href: "/e-social",
    },
    {
      id: "aguardando-clinica",
      priority: aguardandoClinica > 3 ? "media" : "baixa",
      title: "Aguardando clínica",
      count: aguardandoClinica,
      description: "ASOs não enviados à clínica",
      href: "/exames",
    },
  ];

  return cards
    .filter((c) => c.count > 0)
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export function buildDashboardAgenda(
  agendamentos: AgendamentoWithExames[],
  filter: DashboardAgendaFilter
): DashboardAgendaRow[] {
  const hoje = todayIso();
  const amanha = addDaysIso(hoje, 1);
  const semana = weekRangeIso();

  return activeAgendamentos(agendamentos)
    .filter((a) => {
      const data = a.data_agendamento.split("T")[0];
      if (filter === "hoje") return data === hoje;
      if (filter === "amanha") return data === amanha;
      if (filter === "atrasados") return data < hoje;
      return data >= semana.inicio && data <= semana.fim;
    })
    .map((a) => {
      const { status, statusTone } = agendaStatus(a, hoje);
      return {
        id: a.id,
        colaborador: a.colaborador,
        empresa: a.cliente_nome,
        tipoAso: a.aso,
        horario: a.horario ?? "—",
        clinica: a.clinica_nome,
        status,
        statusTone,
        dataIso: a.data_agendamento.split("T")[0],
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

export function buildDashboardEsocial(
  agendamentos: AgendamentoWithExames[]
): { summary: DashboardEsocialSummary; rows: DashboardEsocialRow[] } {
  const filtered = orderESocialForTable(
    filterAgendamentosESocial(agendamentos, {
      cliente: "",
      colaborador: "",
      statusEsocial: "acao",
      mesReferencia: "",
      dataInicio: "",
      dataFim: "",
    }),
    null
  );

  const allActive = activeAgendamentos(agendamentos);
  const stats = computeESocialSummary(allActive);

  const rows = filtered.slice(0, 12).map((a) => ({
    id: a.id,
    empresa: a.cliente_nome,
    colaborador: a.colaborador,
    dataExame: formatDateBR(a.data_agendamento),
    status: getESocialVisualStatus(a),
  }));

  return {
    summary: {
      pendente: stats.pendentes,
      enviada: stats.enviados,
      urgente: stats.enviarUrgente,
    },
    rows,
  };
}

export function buildDashboardPeriodicos(
  periodicos: PeriodicoFuturoRecord[]
): { summary: DashboardPeriodicosSummary; rows: DashboardPeriodicosRow[] } {
  const rows = actionablePeriodicos(periodicos);
  const reagendados = periodicos.filter((p) => p.status === "reagendado").length;

  const summary: DashboardPeriodicosSummary = {
    vencendo30Dias: rows.filter((p) => p.displayStatus === "vence_30_dias").length,
    vencidos: rows.filter((p) => p.displayStatus === "vencido").length,
    reagendados,
  };

  const tableRows = rows
    .filter(
      (p) =>
        p.displayStatus === "vencido" || p.displayStatus === "vence_30_dias"
    )
    .slice(0, 12)
    .map((p) => ({
      id: p.id,
      empresa: p.cliente_nome,
      colaborador: p.colaborador,
      exame: p.exame_nome,
      proximaData: p.proximaDataBR,
      status: p.displayStatus,
    }));

  return { summary, rows: tableRows };
}

export function buildDashboardDocumentacao(
  agendamentos: AgendamentoWithExames[]
): DashboardDocumentacaoCounts {
  const hoje = todayIso();
  const active = activeAgendamentos(agendamentos);

  const naoAssinados = active.filter((a) => !a.aso_assinado).length;
  const naoEnviadosCliente = active.filter((a) => !a.aso_enviado_cliente).length;
  const pendentesClinica = active.filter((a) => !a.aso_enviado_clinica).length;

  const semRecebimento = active.filter((a) => {
    const data = a.data_agendamento.split("T")[0];
    if (data > hoje) return false;
    if (a.aso_assinado) return false;
    return !a.data_aso_assinado;
  }).length;

  return {
    naoAssinados,
    naoEnviadosCliente,
    semRecebimento,
    pendentesClinica,
  };
}

export function buildDashboardCharts(
  agendamentos: AgendamentoWithExames[],
  periodicos: PeriodicoFuturoRecord[]
): DashboardCharts {
  const range = currentMonthRange();
  const hoje = todayIso();
  const active = activeAgendamentos(agendamentos);
  const periodicoRows = actionablePeriodicos(periodicos);

  const dayMap = new Map<string, number>();
  if (range) {
    const cursor = new Date(`${range.inicio}T12:00:00`);
    const end = new Date(`${range.fim}T12:00:00`);
    while (cursor <= end) {
      const iso = cursor.toISOString().split("T")[0];
      dayMap.set(iso, 0);
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const asoMap = new Map<string, number>();
  let esocialPendente = 0;
  let esocialUrgente = 0;
  let esocialEnviado = 0;

  active.forEach((a) => {
    const data = a.data_agendamento.split("T")[0];
    const inMonth = !range || (data >= range.inicio && data <= range.fim);

    if (inMonth && data <= hoje) {
      dayMap.set(data, (dayMap.get(data) ?? 0) + 1);
      const tipo = a.aso?.trim() || "—";
      asoMap.set(tipo, (asoMap.get(tipo) ?? 0) + 1);
    }

    const esocialStatus = getESocialVisualStatus(a);
    if (esocialStatus === "pendente") esocialPendente += 1;
    else if (esocialStatus === "urgente") esocialUrgente += 1;
    else esocialEnviado += 1;
  });

  const agendamentosPorDia = Array.from(dayMap.entries()).map(([iso, value]) => ({
      label: formatDateBR(iso).slice(0, 5),
      value,
    }));

  const asosPorTipo = Array.from(asoMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  const pendenciasEsocial = [
    { label: "Pendente", value: esocialPendente },
    { label: "Urgente", value: esocialUrgente },
    { label: "Enviado", value: esocialEnviado },
  ];

  const vencidos = periodicoRows.filter((p) => p.displayStatus === "vencido").length;
  const vencendo30 = periodicoRows.filter(
    (p) => p.displayStatus === "vence_30_dias"
  ).length;
  const emDia = periodicoRows.filter((p) => p.displayStatus === "em_dia").length;

  const periodicosVencendo = [
    { label: "Vencidos", value: vencidos },
    { label: "30 dias", value: vencendo30 },
    { label: "Em dia", value: emDia },
  ];

  return {
    agendamentosPorDia,
    asosPorTipo,
    pendenciasEsocial,
    periodicosVencendo,
  };
}
