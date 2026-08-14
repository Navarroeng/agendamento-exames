import type { ClienteContratoStatus } from "@/lib/types";

export interface RelatoriosFilters {
  mesReferencia: string;
  empresa: string;
  clinica: string;
  responsavel: string;
  statusContrato: "" | ClienteContratoStatus;
}

export const EMPTY_RELATORIOS_FILTERS: RelatoriosFilters = {
  mesReferencia: "",
  empresa: "",
  clinica: "",
  responsavel: "",
  statusContrato: "",
};

export interface RelatoriosKpis {
  totalAsosMes: number;
  totalFaturado: number;
  custosClinicas: number;
  lucroBruto: number;
  pendenciasEsocial: number;
  periodicosVencendo: number;
  contratosVencendo: number;
  contratosAtivos: number;
  receitaContratualAnual: number;
}

export interface LucratividadeEmpresaRow {
  empresa: string;
  totalFaturado: number;
  custoClinica: number;
  lucro: number;
  margemPercentual: number;
}

export interface LucratividadeClinicaRow {
  clinica: string;
  totalExames: number;
  custoTotal: number;
  ticketMedio: number;
}

export interface PeriodicoRow {
  id: string;
  empresa: string;
  colaborador: string;
  exame: string;
  ultimaRealizacao: string;
  proximaData: string;
  status: "vencido" | "vence_30" | "em_dia";
}

export interface ContratoRenovacaoRow {
  id: string;
  empresa: string;
  clienteId: string;
  inicio: string;
  fim: string;
  valorAnterior: number | null;
  valorRenovado: number | null;
  reajustePercentual: number | null;
  colaboradores: number | null;
  status: ClienteContratoStatus;
  responsavel: string;
}

export interface ContratoVencendoRow {
  id: string;
  empresa: string;
  clienteId: string;
  vencimento: string;
  diasRestantes: number;
  valorContrato: number | null;
  colaboradores: number | null;
  status: "vencido" | "vence_30" | "vence_60" | "ativo";
}

export interface ChartPoint {
  label: string;
  value: number;
  value2?: number;
  value3?: number;
}
