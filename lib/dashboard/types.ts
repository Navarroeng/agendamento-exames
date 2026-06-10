import type { ESocialVisualStatus } from "@/lib/esocial-filters";
import type { ChartPoint } from "@/lib/relatorios/types";
import type { PeriodicoFuturoDisplayStatus } from "@/lib/types";

export type DashboardAgendaFilter =
  | "hoje"
  | "amanha"
  | "semana"
  | "atrasados";

export type DashboardAlertPriority = "alta" | "media" | "baixa";

export interface DashboardKpis {
  agendamentosDoDia: number;
  pendenciasEsocial: number;
  asosPendentesAssinatura: number;
  asosPendentesEnvioCliente: number;
  periodicosVencendo30Dias: number;
  periodicosVencidos: number;
  agendamentosPendentesClinica: number;
  examesRealizadosMes: number;
  totalAsosMes: number;
}

export interface DashboardAtencaoCard {
  id: string;
  priority: DashboardAlertPriority;
  title: string;
  count: number;
  description: string;
  href: string;
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

export interface DashboardEsocialSummary {
  pendente: number;
  enviada: number;
  urgente: number;
}

export interface DashboardEsocialRow {
  id: string;
  empresa: string;
  colaborador: string;
  dataExame: string;
  status: ESocialVisualStatus;
}

export interface DashboardPeriodicosSummary {
  vencendo30Dias: number;
  vencidos: number;
  reagendados: number;
}

export interface DashboardPeriodicosRow {
  id: string;
  empresa: string;
  colaborador: string;
  exame: string;
  proximaData: string;
  status: PeriodicoFuturoDisplayStatus;
}

export interface DashboardDocumentacaoCounts {
  naoAssinados: number;
  naoEnviadosCliente: number;
  semRecebimento: number;
  pendentesClinica: number;
}

export interface DashboardCharts {
  agendamentosPorDia: ChartPoint[];
  asosPorTipo: ChartPoint[];
  pendenciasEsocial: ChartPoint[];
  periodicosVencendo: ChartPoint[];
}
