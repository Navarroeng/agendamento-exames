import { textMatchesSearch } from "@/lib/text-normalize";
import { buildPendencias } from "@/lib/agendamentos-table";
import type { AgendamentoWithExames } from "@/lib/types";

export const AGENDAMENTOS_PAGE_SIZE = 15;

export interface AgendamentoFilters {
  cliente: string;
  colaborador: string;
  clinica: string;
  tipoExame: string;
  aso: string;
  status: string;
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
  cliente: "",
  colaborador: "",
  clinica: "",
  tipoExame: "",
  aso: "",
  status: "",
  responsavel: "",
  pendencia: "",
  pendenciaSituacao: "",
  esocial: "",
};

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

export function filterAgendamentos(
  agendamentos: AgendamentoWithExames[],
  filters: AgendamentoFilters
): AgendamentoWithExames[] {
  return agendamentos.filter((item) => {
    if (!matchesText(item.cliente_nome, filters.cliente)) return false;
    if (!matchesText(item.colaborador, filters.colaborador)) return false;
    if (!matchesText(item.clinica_nome, filters.clinica)) return false;
    if (!matchesText(item.aso, filters.aso)) return false;
    if (!matchesText(item.responsavel, filters.responsavel)) return false;

    if (filters.status && item.status !== filters.status) return false;

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
}

export function hasActiveFilters(filters: AgendamentoFilters): boolean {
  return Object.values(filters).some((v) => v.trim() !== "");
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
