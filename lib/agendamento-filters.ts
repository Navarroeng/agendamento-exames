import { textMatchesSearch } from "@/lib/text-normalize";
import { parseMonthYearBRToIsoRange } from "@/lib/agendamento-datetime";
import { getCurrentMonthReferenceBR } from "@/lib/month-reference-options";
import { buildPendencias } from "@/lib/agendamentos-table";
import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";

export const AGENDAMENTOS_PAGE_SIZE = 15;

/** Ordem do filtro Status (não alterar significado dos status). */
export const AGENDAMENTO_STATUS_FILTER_OPTIONS = [
  { value: "agendado", label: "Agendado" },
  { value: "aso_retido", label: "ASO Retido" },
  { value: "rascunho", label: "Rascunho" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export type AgendamentoStatusFiltro =
  (typeof AGENDAMENTO_STATUS_FILTER_OPTIONS)[number]["value"];

export const AGENDAMENTO_STATUS_FILTRO_VALORES: readonly AgendamentoStatusFiltro[] =
  AGENDAMENTO_STATUS_FILTER_OPTIONS.map((o) => o.value);

export interface AgendamentoFilters {
  mesReferencia: string;
  cliente: string;
  colaborador: string;
  clinica: string;
  tipoExame: string;
  aso: string;
  /** Vazio = Todos. Subconjunto = OR entre os status. */
  status: AgendamentoStatusFiltro[];
  responsavel: string;
  pendencia: string;
  pendenciaSituacao: string;
  esocial: string;
}

export const ESOCIAL_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "concluida", label: "Concluído" },
] as const;

export const PENDENCIA_SITUACAO_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "pendente", label: "Pendente" },
  { value: "concluida", label: "Concluída" },
] as const;

export const EMPTY_AGENDAMENTO_FILTERS: AgendamentoFilters = {
  mesReferencia: "",
  cliente: "",
  colaborador: "",
  clinica: "",
  tipoExame: "",
  aso: "",
  status: [],
  responsavel: "",
  pendencia: "",
  pendenciaSituacao: "",
  esocial: "",
};

export function getDefaultAgendamentoFilters(): AgendamentoFilters {
  return {
    ...EMPTY_AGENDAMENTO_FILTERS,
    mesReferencia: getCurrentMonthReferenceBR(),
    status: [],
  };
}

function matchesEsocialFilter(
  agendamento: AgendamentoWithExames,
  esocial: string
): boolean {
  const sit = esocial.trim();
  if (!sit) return true;
  if (sit === "pendente") return !agendamento.envio_esocial;
  if (sit === "concluida") return !!agendamento.envio_esocial;
  return true;
}

function matchesPendenciaFilter(
  agendamento: AgendamentoWithExames,
  pendencia: string,
  situacao: string
): boolean {
  const tipo = pendencia.trim();
  const sit = situacao.trim();
  if (!tipo && !sit) return true;

  const pendencias = buildPendencias(agendamento);

  if (!tipo && sit === "pendente") {
    return pendencias.some((p) => p.status === "pending");
  }
  if (!tipo && sit === "concluida") {
    return pendencias.every((p) => p.status === "done");
  }

  if (tipo) {
    const item = pendencias.find((p) => p.label === tipo);
    if (!item) return false;
    const effectiveSit = sit || "pendente";
    if (effectiveSit === "pendente") return item.status === "pending";
    if (effectiveSit === "concluida") return item.status === "done";
  }

  return true;
}

function matchesText(value: string, query: string): boolean {
  return textMatchesSearch(value, query);
}

export function isAgendamentoStatusFiltroTodos(
  selected: readonly string[] | null | undefined
): boolean {
  if (!selected || selected.length === 0) return true;
  if (selected.length !== AGENDAMENTO_STATUS_FILTRO_VALORES.length) return false;
  return AGENDAMENTO_STATUS_FILTRO_VALORES.every((value) =>
    selected.includes(value)
  );
}

export function normalizeAgendamentoStatusFiltro(
  selected: readonly string[] | null | undefined
): AgendamentoStatusFiltro[] {
  const allowed = new Set<string>(AGENDAMENTO_STATUS_FILTRO_VALORES);
  const unique = Array.from(new Set(selected ?? [])).filter(
    (value): value is AgendamentoStatusFiltro => allowed.has(value)
  );
  if (isAgendamentoStatusFiltroTodos(unique)) return [];
  return AGENDAMENTO_STATUS_FILTRO_VALORES.filter((value) =>
    unique.includes(value)
  );
}

export function toggleAgendamentoStatusFiltro(
  current: readonly AgendamentoStatusFiltro[],
  option: "todos" | AgendamentoStatusFiltro
): AgendamentoStatusFiltro[] {
  if (option === "todos") return [];
  const expanded = isAgendamentoStatusFiltroTodos(current)
    ? [...AGENDAMENTO_STATUS_FILTRO_VALORES]
    : normalizeAgendamentoStatusFiltro(current);
  const next = new Set(expanded);
  if (next.has(option)) next.delete(option);
  else next.add(option);
  return normalizeAgendamentoStatusFiltro(Array.from(next));
}

export function isAgendamentoStatusFiltroMarcado(
  current: readonly AgendamentoStatusFiltro[],
  option: "todos" | AgendamentoStatusFiltro
): boolean {
  if (option === "todos") return isAgendamentoStatusFiltroTodos(current);
  if (isAgendamentoStatusFiltroTodos(current)) return true;
  return current.includes(option);
}

export function labelAgendamentoStatusFiltro(
  selected: readonly AgendamentoStatusFiltro[]
): string {
  if (isAgendamentoStatusFiltroTodos(selected)) return "Todos";
  const labels = AGENDAMENTO_STATUS_FILTER_OPTIONS.filter((opt) =>
    selected.includes(opt.value)
  ).map((opt) => opt.label);
  if (labels.length <= 1) return labels[0] ?? "Todos";
  return `${labels[0]} + ${labels.length - 1}`;
}

export function matchesAgendamentoStatusFiltro(
  itemStatus: AgendamentoStatus | string,
  selected: readonly AgendamentoStatusFiltro[]
): boolean {
  if (isAgendamentoStatusFiltroTodos(selected)) return true;
  return selected.includes(itemStatus as AgendamentoStatusFiltro);
}

export function hasActiveFilters(filters: AgendamentoFilters): boolean {
  const { mesReferencia: _mes, status, ...rest } = filters;
  if (!isAgendamentoStatusFiltroTodos(status)) return true;
  return Object.values(rest).some((v) => v.trim() !== "");
}

/** Data do exame crescente; desempate por horário. */
export function compareAgendamentosPorDataExameAsc(
  a: AgendamentoWithExames,
  b: AgendamentoWithExames
): number {
  const da = a.data_agendamento.split("T")[0];
  const db = b.data_agendamento.split("T")[0];
  const dateCmp = da.localeCompare(db);
  if (dateCmp !== 0) return dateCmp;
  return (a.horario ?? "").localeCompare(b.horario ?? "");
}

export function filterAgendamentos(
  agendamentos: AgendamentoWithExames[],
  filters: AgendamentoFilters
): AgendamentoWithExames[] {
  const range = filters.mesReferencia.trim()
    ? parseMonthYearBRToIsoRange(filters.mesReferencia)
    : null;

  const filtered = agendamentos.filter((item) => {
    const data = item.data_agendamento.split("T")[0];
    if (range && (data < range.inicio || data > range.fim)) return false;

    if (!matchesText(item.cliente_nome, filters.cliente)) return false;
    if (!matchesText(item.colaborador, filters.colaborador)) return false;
    if (!matchesText(item.clinica_nome, filters.clinica)) return false;
    if (!matchesText(item.aso, filters.aso)) return false;
    if (!matchesText(item.responsavel, filters.responsavel)) return false;

    if (!matchesAgendamentoStatusFiltro(item.status, filters.status)) {
      return false;
    }

    if (filters.tipoExame.trim()) {
      const exames = item.agendamento_exames ?? [];
      const hasExam = exames.some((e) =>
        matchesText(e.tipo_exame, filters.tipoExame)
      );
      if (!hasExam) return false;
    }

    if (
      !matchesPendenciaFilter(
        item,
        filters.pendencia,
        filters.pendenciaSituacao
      )
    ) {
      return false;
    }

    if (!matchesEsocialFilter(item, filters.esocial)) return false;

    return true;
  });

  return filtered;
}

export function extractFilterOptions(agendamentos: AgendamentoWithExames[]) {
  const colaboradores = new Set<string>();
  const clinicas = new Set<string>();
  const asos = new Set<string>();
  const tiposExame = new Set<string>();
  const responsaveis = new Set<string>();

  agendamentos.forEach((a) => {
    if (a.colaborador) colaboradores.add(a.colaborador);
    if (a.clinica_nome) clinicas.add(a.clinica_nome);
    if (a.aso) asos.add(a.aso);
    if (a.responsavel) responsaveis.add(a.responsavel);
    (a.agendamento_exames ?? []).forEach((e) => {
      if (e.tipo_exame) tiposExame.add(e.tipo_exame);
    });
  });

  const sort = (arr: string[]) => arr.sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    colaboradores: sort(Array.from(colaboradores)),
    clinicas: sort(Array.from(clinicas)),
    asos: sort(Array.from(asos)),
    tiposExame: sort(Array.from(tiposExame)),
    responsaveis: sort(Array.from(responsaveis)),
  };
}
