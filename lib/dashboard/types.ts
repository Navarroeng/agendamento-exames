export type DashboardAgendaFilter = "hoje" | "amanha" | "semana";

export type DashboardKpiKey =
  | "pendenciasEsocial"
  | "asosNaoRecebidosClinicas"
  | "asosNaoEnviadosClientes"
  | "periodicosVencidos"
  | "periodicosVencendoMesAtual"
  | "agendamentosDoDia";

export interface DashboardKpis {
  pendenciasEsocial: number;
  asosNaoRecebidosClinicas: number;
  asosNaoEnviadosClientes: number;
  periodicosVencidos: number;
  periodicosVencendoMesAtual: number;
  agendamentosDoDia: number;
}

export type DashboardKpiStatusTone =
  | "active"
  | "pending"
  | "overdue"
  | "draft"
  | "cancelled";

export type DashboardKpiColumnId =
  | "horario"
  | "colaborador"
  | "empresa"
  | "data"
  | "clinica"
  | "tipoAso"
  | "exame"
  | "status";

export interface DashboardKpiColumn {
  id: DashboardKpiColumnId;
  label: string;
}

export interface DashboardKpiDetailRow {
  id: string;
  colaborador: string;
  empresa: string;
  dataIso: string;
  dataLabel: string;
  horario: string;
  clinica: string;
  tipoAso: string;
  exame: string;
  status: string;
  statusTone: DashboardKpiStatusTone;
}

export interface DashboardAgendaRow {
  id: string;
  colaborador: string;
  empresa: string;
  tipoAso: string;
  horario: string;
  clinica: string;
  status: string;
  statusTone: DashboardKpiStatusTone;
  dataIso: string;
}

export interface DashboardCardHrefs {
  esocial: string;
  asosClinica: string;
  asosCliente: string;
  periodicosVencidos: string;
  periodicosMesAtual: string;
  agendamentosHoje: string;
}
