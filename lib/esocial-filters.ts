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
  | "todos";

export type ESocialVisualStatus = "enviado" | "pendente" | "urgente";

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

export function getESocialVisualStatus(
  agendamento: AgendamentoWithExames
): ESocialVisualStatus {
  if (isEnvioEsocialConcluido(agendamento.envio_esocial)) return "enviado";
  const dias = daysSinceExam(agendamento.data_agendamento);
  if (dias > URGENTE_DIAS) return "urgente";
  return "pendente";
}

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
    case "todos":
      return true;
    default:
      return true;
  }
}

function compareAgendamentosESocial(
  a: AgendamentoWithExames,
  b: AgendamentoWithExames
): number {
  const da = a.data_agendamento.split("T")[0];
  const db = b.data_agendamento.split("T")[0];
  const dateCmp = da.localeCompare(db);
  if (dateCmp !== 0) return dateCmp;
  return (a.horario ?? "").localeCompare(b.horario ?? "");
}

export function filterAgendamentosESocial(
  agendamentos: AgendamentoWithExames[],
  filters: ESocialFilters
): AgendamentoWithExames[] {
  return agendamentos
    .filter((item) => {
      if (item.status === "cancelado") return false;
      if (!matchesText(item.cliente_nome, filters.cliente)) return false;
      if (!matchesText(item.colaborador, filters.colaborador)) return false;
      if (!matchesStatusFilter(item, filters.statusEsocial)) return false;
      if (!matchesPeriodo(item.data_agendamento, filters)) return false;
      return true;
    })
    .sort(compareAgendamentosESocial);
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
    else pendentes += 1;
  });

  const percentualEnviado =
    total > 0 ? Math.round((enviados / total) * 100) : 0;

  return { total, pendentes, enviarUrgente, enviados, percentualEnviado };
}
