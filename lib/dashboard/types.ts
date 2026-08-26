export type DashboardAgendaFilter =
  | "hoje"
  | "amanha"
  | "semana"
  | "atrasados";

export interface DashboardKpis {
  pendenciasEsocial: number;
  asosNaoRecebidosClinicas: number;
  asosNaoEnviadosClientes: number;
  periodicosVencidos: number;
  periodicosVencendoMesAtual: number;
  agendamentosDoDia: number;
}

export interface DashboardAgendaRow {
  id: string;
  colaborador: string;
  empresa: string;
  tipoAso: string;
  horario: string;
  clinica: string;
  status: string;
  statusTone: "active" | "pending" | "overdue" | "draft" | "cancelled";
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
