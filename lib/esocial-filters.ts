import { textMatchesSearch } from "@/lib/text-normalize";
import {
  parseDateBRToIso,
  parseMonthYearBRToIsoRange,
} from "@/lib/agendamento-datetime";
import type { AgendamentoWithExames } from "@/lib/types";

export const ESOCIAL_PAGE_SIZE = 30;

export type ESocialStatusFilter =
  | "acao"
  | "pendente"
  | "urgente"
  | "enviado"
  | "cancelado"
  | "todos";

export type ESocialVisualStatus =
  | "enviado"
  | "pendente"
  | "urgente"
  | "cancelado";

export interface ESocialFilters {
  cliente: string;
  colaborador: string;
  statusEsocial: ESocialStatusFilter;
  mesReferencia: string;
  dataInicio: string;
  dataFim: string;
}

export const ESOCIAL_STATUS_OPTIONS: ReadonlyArray<{
  value: ESocialStatusFilter;
  label: string;
}> = [
  { value: "acao", label: "Pendentes + Enviar urgente" },
  { value: "pendente", label: "Pendentes" },
  { value: "urgente", label: "Enviar urgente" },
  { value: "enviado", label: "Enviado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "todos", label: "Todos" },
];

export const EMPTY_ESOCIAL_FILTERS: ESocialFilters = {
  cliente: "",
  colaborador: "",
  statusEsocial: "acao",
  mesReferencia: "",
  dataInicio: "",
  dataFim: "",
};

const URGENTE_DIAS = 30;

export function isEsocialEnvioCancelado(
  agendamento: Pick<AgendamentoWithExames, "esocial_envio_cancelado">
): boolean {
  return agendamento.esocial_envio_cancelado === true;
}

/** Normaliza envio_esocial (boolean ou legado Sim/Não/texto do banco). */
export function isEnvioEsocialConcluido(
  envio: boolean | string | null | undefined
): boolean {
  if (envio === true) return true;
  if (envio === false || envio == null) return false;
  if (typeof envio === "string") {
    const s = envio.trim().toLowerCase();
    if (s === "sim" || s === "true" || s === "1" || s === "t") return true;
    if (
      s === "não" ||
      s === "nao" ||
      s === "false" ||
      s === "0" ||
      s === "f" ||
      s === ""
    ) {
      return false;
    }
  }
  return Boolean(envio);
}

function daysSinceExam(isoDate: string): number {
  const exam = new Date(`${isoDate.split("T")[0]}T12:00:00`);
  const hoje = new Date(`${new Date().toISOString().split("T")[0]}T12:00:00`);
  return Math.floor((hoje.getTime() - exam.getTime()) / 86400000);
}

/** Status derivado sem considerar cancelamento (para gravar status anterior). */
export function getESocialVisualStatusSemCancelamento(
  agendamento: AgendamentoWithExames
): Exclude<ESocialVisualStatus, "cancelado"> {
  if (isEnvioEsocialConcluido(agendamento.envio_esocial)) return "enviado";
  const dias = daysSinceExam(agendamento.data_agendamento);
  if (dias > URGENTE_DIAS) return "urgente";
  return "pendente";
}

export function getESocialVisualStatus(
  agendamento: AgendamentoWithExames
): ESocialVisualStatus {
  if (isEsocialEnvioCancelado(agendamento)) return "cancelado";
  return getESocialVisualStatusSemCancelamento(agendamento);
}

export const ESOCIAL_VISUAL_STATUS_LABELS: Record<ESocialVisualStatus, string> =
  {
    enviado: "Enviado",
    pendente: "Pendente",
    urgente: "Enviar urgente",
    cancelado: "Cancelado",
  };

function matchesText(value: string, query: string): boolean {
  return textMatchesSearch(value, query);
}

function matchesPeriodo(
  dataAgendamentoIso: string,
  filters: ESocialFilters
): boolean {
  const data = dataAgendamentoIso.split("T")[0];

  if (filters.mesReferencia.trim()) {
    const range = parseMonthYearBRToIsoRange(filters.mesReferencia);
    if (!range) return true;
    return data >= range.inicio && data <= range.fim;
  }

  const inicioIso = filters.dataInicio.trim()
    ? parseDateBRToIso(filters.dataInicio)
    : null;
  const fimIso = filters.dataFim.trim()
    ? parseDateBRToIso(filters.dataFim)
    : null;

  if (inicioIso && data < inicioIso) return false;
  if (fimIso && data > fimIso) return false;

  return true;
}

function matchesStatusFilter(
  agendamento: AgendamentoWithExames,
  status: ESocialStatusFilter
): boolean {
  const visual = getESocialVisualStatus(agendamento);

  switch (status) {
    case "acao":
      return visual === "pendente" || visual === "urgente";
    case "pendente":
      return visual === "pendente";
    case "urgente":
      return visual === "urgente";
    case "enviado":
      return visual === "enviado";
    case "cancelado":
      return visual === "cancelado";
    case "todos":
      return true;
    default:
      return true;
  }
}

export function filterAgendamentosESocial(
  agendamentos: AgendamentoWithExames[],
  filters: ESocialFilters
): AgendamentoWithExames[] {
  return agendamentos.filter((item) => {
    if (item.status === "cancelado") return false;
    if (!matchesText(item.cliente_nome, filters.cliente)) return false;
    if (!matchesText(item.colaborador, filters.colaborador)) return false;
    if (!matchesStatusFilter(item, filters.statusEsocial)) return false;
    if (!matchesPeriodo(item.data_agendamento, filters)) return false;
    return true;
  });
}

export function hasActiveESocialFilters(filters: ESocialFilters): boolean {
  if (filters.statusEsocial !== "acao") return true;
  return (
    filters.cliente.trim() !== "" ||
    filters.colaborador.trim() !== "" ||
    filters.mesReferencia.trim() !== "" ||
    filters.dataInicio.trim() !== "" ||
    filters.dataFim.trim() !== ""
  );
}

export function extractESocialFilterOptions(
  agendamentos: AgendamentoWithExames[]
) {
  const colaboradores = new Set<string>();

  agendamentos
    .filter((a) => a.status !== "cancelado")
    .forEach((a) => {
      if (a.colaborador) colaboradores.add(a.colaborador);
    });

  const sort = (arr: string[]) => arr.sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    colaboradores: sort(Array.from(colaboradores)),
  };
}

export interface ESocialSummaryStats {
  total: number;
  pendentes: number;
  enviarUrgente: number;
  enviados: number;
  percentualEnviado: number;
}

export function computeESocialSummary(
  agendamentos: AgendamentoWithExames[]
): ESocialSummaryStats {
  const total = agendamentos.length;
  let pendentes = 0;
  let enviarUrgente = 0;
  let enviados = 0;

  agendamentos.forEach((a) => {
    const visual = getESocialVisualStatus(a);
    if (visual === "enviado") enviados += 1;
    else if (visual === "urgente") enviarUrgente += 1;
    else if (visual === "pendente") pendentes += 1;
    // cancelado: não entra em pendentes/urgente/enviados
  });

  const percentualEnviado =
    total > 0 ? Math.round((enviados / total) * 100) : 0;

  return { total, pendentes, enviarUrgente, enviados, percentualEnviado };
}
