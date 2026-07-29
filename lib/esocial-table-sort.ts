import {
  getESocialVisualStatus,
  isEnvioEsocialConcluido,
} from "@/lib/esocial-filters";
import type { AgendamentoWithExames } from "@/lib/types";

export type ESocialTableSortColumn =
  | "dataExame"
  | "cliente"
  | "colaborador"
  | "aso"
  | "statusEsocial"
  | "dataEnvioEsocial";

export type ESocialTableSortDirection = "asc" | "desc";

export interface ESocialTableSortState {
  column: ESocialTableSortColumn;
  direction: ESocialTableSortDirection;
}

export const ESOCIAL_TABLE_SORT_COLUMNS: {
  key: ESocialTableSortColumn;
  label: string;
}[] = [
  { key: "dataExame", label: "Data do exame" },
  { key: "cliente", label: "Empresa / Cliente" },
  { key: "colaborador", label: "Colaborador" },
  { key: "aso", label: "Tipo de ASO" },
  { key: "statusEsocial", label: "Status e-Social" },
  { key: "dataEnvioEsocial", label: "Data envio e-Social" },
];

const STATUS_SORT_LABELS: Record<
  ReturnType<typeof getESocialVisualStatus>,
  string
> = {
  enviado: "Enviado",
  urgente: "Enviar urgente",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

function compareTextPtBr(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base", numeric: true });
}

/** Ordem padrão da tela e-Social: data do exame crescente, depois horário. */
export function compareAgendamentosESocialDefault(
  a: AgendamentoWithExames,
  b: AgendamentoWithExames
): number {
  const da = a.data_agendamento.split("T")[0];
  const db = b.data_agendamento.split("T")[0];
  const dateCmp = da.localeCompare(db);
  if (dateCmp !== 0) return dateCmp;
  return (a.horario ?? "").localeCompare(b.horario ?? "");
}

function compareDataEnvioEsocial(
  a: AgendamentoWithExames,
  b: AgendamentoWithExames
): number {
  const aSent = isEnvioEsocialConcluido(a.envio_esocial);
  const bSent = isEnvioEsocialConcluido(b.envio_esocial);
  const aDate = aSent && a.data_envio_esocial ? a.data_envio_esocial.split("T")[0] : "";
  const bDate = bSent && b.data_envio_esocial ? b.data_envio_esocial.split("T")[0] : "";

  if (!aDate && !bDate) return 0;
  if (!aDate) return 1;
  if (!bDate) return -1;
  return aDate.localeCompare(bDate);
}

export function compareESocialTableColumn(
  a: AgendamentoWithExames,
  b: AgendamentoWithExames,
  column: ESocialTableSortColumn
): number {
  switch (column) {
    case "dataExame":
      return compareAgendamentosESocialDefault(a, b);
    case "cliente":
      return compareTextPtBr(a.cliente_nome, b.cliente_nome);
    case "colaborador":
      return compareTextPtBr(a.colaborador, b.colaborador);
    case "aso":
      return compareTextPtBr(a.aso, b.aso);
    case "statusEsocial": {
      const labelA = STATUS_SORT_LABELS[getESocialVisualStatus(a)];
      const labelB = STATUS_SORT_LABELS[getESocialVisualStatus(b)];
      return compareTextPtBr(labelA, labelB);
    }
    case "dataEnvioEsocial":
      return compareDataEnvioEsocial(a, b);
    default:
      return 0;
  }
}

export function cycleESocialTableSort(
  current: ESocialTableSortState | null,
  column: ESocialTableSortColumn
): ESocialTableSortState | null {
  if (!current || current.column !== column) {
    return { column, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { column, direction: "desc" };
  }
  return null;
}

export function sortESocialForTable(
  agendamentos: AgendamentoWithExames[],
  sort: ESocialTableSortState
): AgendamentoWithExames[] {
  const multiplier = sort.direction === "asc" ? 1 : -1;

  return [...agendamentos].sort((a, b) => {
    const cmp = compareESocialTableColumn(a, b, sort.column);
    if (cmp !== 0) return cmp * multiplier;
    return compareAgendamentosESocialDefault(a, b);
  });
}

export function orderESocialForTable(
  agendamentos: AgendamentoWithExames[],
  sort: ESocialTableSortState | null
): AgendamentoWithExames[] {
  if (sort) return sortESocialForTable(agendamentos, sort);
  return [...agendamentos].sort(compareAgendamentosESocialDefault);
}
