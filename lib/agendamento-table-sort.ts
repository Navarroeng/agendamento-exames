import {
  compareAgendamentosPorDataExameAsc,
  hasActiveFilters,
  type AgendamentoFilters,
} from "@/lib/agendamento-filters";
import type { AgendamentoWithExames } from "@/lib/types";

export type AgendamentoTableSortColumn =
  | "dataAgendada"
  | "cliente"
  | "colaborador"
  | "aso"
  | "exames"
  | "totalCliente"
  | "status"
  | "asoClinica"
  | "asoAssinado"
  | "asoCliente"
  | "matricula"
  | "esocial";

export type AgendamentoTableSortDirection = "asc" | "desc";

export interface AgendamentoTableSortState {
  column: AgendamentoTableSortColumn;
  direction: AgendamentoTableSortDirection;
}

export const AGENDAMENTO_TABLE_SORT_COLUMNS: {
  key: AgendamentoTableSortColumn;
  label: string;
  center?: boolean;
}[] = [
  { key: "dataAgendada", label: "Data agendada" },
  { key: "cliente", label: "Cliente" },
  { key: "colaborador", label: "Colaborador" },
  { key: "aso", label: "ASO" },
  { key: "exames", label: "Exames" },
  { key: "totalCliente", label: "Total Cliente" },
  { key: "status", label: "Status" },
  { key: "asoClinica", label: "ASO Clínica", center: true },
  { key: "asoAssinado", label: "ASO Assinado", center: true },
  { key: "asoCliente", label: "ASO Cliente", center: true },
  { key: "matricula", label: "Matrícula", center: true },
  { key: "esocial", label: "e-Social", center: true },
];

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  cancelado: "Cancelado",
  agendado: "Agendado",
  aso_retido: "ASO Retido",
};

function statusSortLabel(status: string): string {
  return STATUS_LABELS[status] ?? "Pendente";
}

function calcTotalCliente(ag: AgendamentoWithExames): number {
  return (ag.agendamento_exames ?? []).reduce(
    (sum, exam) => sum + Number(exam.valor_cliente),
    0
  );
}

function compareTextPtBr(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
}

function compareBooleanAsc(a: boolean, b: boolean): number {
  return Number(a) - Number(b);
}

export function compareAgendamentosTableColumn(
  a: AgendamentoWithExames,
  b: AgendamentoWithExames,
  column: AgendamentoTableSortColumn
): number {
  switch (column) {
    case "dataAgendada": {
      return compareAgendamentosPorDataExameAsc(a, b);
    }
    case "cliente":
      return compareTextPtBr(a.cliente_nome, b.cliente_nome);
    case "colaborador":
      return compareTextPtBr(a.colaborador, b.colaborador);
    case "aso":
      return compareTextPtBr(a.aso, b.aso);
    case "exames": {
      const examesA = a.agendamento_exames ?? [];
      const examesB = b.agendamento_exames ?? [];
      const countDiff = examesA.length - examesB.length;
      if (countDiff !== 0) return countDiff;
      const nomeA = examesA[0]?.tipo_exame ?? "";
      const nomeB = examesB[0]?.tipo_exame ?? "";
      return compareTextPtBr(nomeA, nomeB);
    }
    case "totalCliente":
      return calcTotalCliente(a) - calcTotalCliente(b);
    case "status":
      return compareTextPtBr(
        statusSortLabel(a.status),
        statusSortLabel(b.status)
      );
    case "asoClinica":
      return compareBooleanAsc(a.aso_enviado_clinica, b.aso_enviado_clinica);
    case "asoAssinado":
      return compareBooleanAsc(a.aso_assinado, b.aso_assinado);
    case "asoCliente":
      return compareBooleanAsc(a.aso_enviado_cliente, b.aso_enviado_cliente);
    case "matricula":
      return compareTextPtBr(
        a.numero_matricula?.trim() || "",
        b.numero_matricula?.trim() || ""
      );
    case "esocial":
      return compareBooleanAsc(!!a.envio_esocial, !!b.envio_esocial);
    default:
      return 0;
  }
}

export function cycleAgendamentoTableSort(
  current: AgendamentoTableSortState | null,
  column: AgendamentoTableSortColumn
): AgendamentoTableSortState | null {
  if (!current || current.column !== column) {
    return { column, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { column, direction: "desc" };
  }
  return null;
}

/** Ordem padrão da tela: API (created_at desc) sem filtros; data do exame asc com filtros. */
export function applyDefaultAgendamentoTableOrder(
  agendamentos: AgendamentoWithExames[],
  filters: AgendamentoFilters
): AgendamentoWithExames[] {
  if (!hasActiveFilters(filters)) return agendamentos;
  return [...agendamentos].sort(compareAgendamentosPorDataExameAsc);
}

export function sortAgendamentosForTable(
  agendamentos: AgendamentoWithExames[],
  sort: AgendamentoTableSortState
): AgendamentoWithExames[] {
  const multiplier = sort.direction === "asc" ? 1 : -1;

  return [...agendamentos].sort((a, b) => {
    const cmp = compareAgendamentosTableColumn(a, b, sort.column);
    if (cmp !== 0) return cmp * multiplier;
    return a.id.localeCompare(b.id);
  });
}

export function orderAgendamentosForTable(
  agendamentos: AgendamentoWithExames[],
  filters: AgendamentoFilters,
  sort: AgendamentoTableSortState | null
): AgendamentoWithExames[] {
  if (sort) return sortAgendamentosForTable(agendamentos, sort);
  return applyDefaultAgendamentoTableOrder(agendamentos, filters);
}
