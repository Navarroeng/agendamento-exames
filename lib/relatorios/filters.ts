import { textMatchesSearch } from "@/lib/text-normalize";
import {
  parseMonthYearBRToIsoRange,
} from "@/lib/agendamento-datetime";
import { getCurrentMonthReferenceBR } from "@/lib/month-reference-options";
import type { AgendamentoWithExames } from "@/lib/types";
import type { RelatoriosFilters } from "./types";

function matchesText(value: string, query: string): boolean {
  return textMatchesSearch(value, query);
}

export function filterAgendamentosRelatorios(
  agendamentos: AgendamentoWithExames[],
  filters: RelatoriosFilters
): AgendamentoWithExames[] {
  const range = filters.mesReferencia.trim()
    ? parseMonthYearBRToIsoRange(filters.mesReferencia)
    : null;

  return agendamentos.filter((item) => {
    if (item.status === "cancelado") return false;

    const data = item.data_agendamento.split("T")[0];
    if (range && (data < range.inicio || data > range.fim)) return false;
    if (!matchesText(item.cliente_nome, filters.empresa)) return false;
    if (!matchesText(item.clinica_nome, filters.clinica)) return false;
    if (!matchesText(item.responsavel, filters.responsavel)) return false;

    return true;
  });
}

export function extractRelatoriosFilterOptions(
  agendamentos: AgendamentoWithExames[]
) {
  const clinicas = new Set<string>();
  const responsaveis = new Set<string>();

  agendamentos
    .filter((a) => a.status !== "cancelado")
    .forEach((a) => {
      if (a.clinica_nome) clinicas.add(a.clinica_nome);
      if (a.responsavel) responsaveis.add(a.responsavel);
    });

  const sort = (arr: string[]) => arr.sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    clinicas: sort(Array.from(clinicas)),
    responsaveis: sort(Array.from(responsaveis)),
  };
}

export function currentMonthReferenciaBR(): string {
  return getCurrentMonthReferenceBR();
}
