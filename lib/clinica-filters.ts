import { compareByLabel } from "@/lib/sort-by-label";
import { textMatchesSearch, textsMatchSearch } from "@/lib/text-normalize";
import type { ClinicaListItem } from "@/lib/types";

export interface ClinicasListFilters {
  busca: string;
}

export const EMPTY_CLINICAS_LIST_FILTERS: ClinicasListFilters = {
  busca: "",
};

export function hasActiveClinicasListFilters(
  filters: ClinicasListFilters
): boolean {
  return filters.busca.trim() !== "";
}

export function filterClinicas(
  clinicas: ClinicaListItem[],
  filters: ClinicasListFilters
): ClinicaListItem[] {
  const busca = filters.busca.trim();
  if (!busca) return clinicas;

  return clinicas.filter((clinica) =>
    textsMatchSearch(
      [
        clinica.nome_fantasia,
        clinica.razao_social,
        clinica.cidade,
        clinica.responsavel,
        clinica.telefone,
        clinica.email,
        clinica.cnpj,
      ],
      busca
    )
  );
}

export function filterClinicaExamesCatalog<T extends { exames: { nome: string; categoria?: string | null } }>(
  items: T[],
  query: string
): T[] {
  const busca = query.trim();
  if (!busca) return items;

  return items.filter((item) =>
    textsMatchSearch(
      [item.exames.nome, item.exames.categoria ?? ""],
      busca
    )
  );
}

export type ClinicaFilterOption = { value: string; label: string };

/** Novo Agendamento: somente clínicas ativas. Não usar no filtro de histórico. */
export function isClinicaDisponivelNovoAgendamento(
  status: string | null | undefined
): boolean {
  return status === "ativa";
}

export function filterClinicasParaNovoAgendamento<
  T extends { status?: string | null },
>(clinicas: T[]): T[] {
  return clinicas.filter((clinica) =>
    isClinicaDisponivelNovoAgendamento(clinica.status)
  );
}

function clinicaFiltroKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function nomeClinicaCadastro(clinica: {
  nome_fantasia?: string | null;
  razao_social?: string | null;
}): string {
  return (clinica.nome_fantasia || clinica.razao_social || "").trim();
}

/**
 * Opções do filtro Clínica em Pesquisar histórico.
 * Independente de usuário, responsável ou permissão: união do cadastro
 * (ativas e inativas) com nomes legados encontrados nos agendamentos.
 */
export function buildClinicaFilterOptionsHistorico(
  clinicas: Array<{
    nome_fantasia?: string | null;
    razao_social?: string | null;
    status?: string | null;
  }>,
  nomesExtras: Array<string | null | undefined> = []
): ClinicaFilterOption[] {
  const byKey = new Map<string, ClinicaFilterOption>();

  for (const clinica of clinicas) {
    const nome = nomeClinicaCadastro(clinica);
    if (!nome) continue;
    const key = clinicaFiltroKey(nome);
    if (byKey.has(key)) continue;
    byKey.set(key, { value: nome, label: nome });
  }

  for (const raw of nomesExtras) {
    const nome = (raw ?? "").trim();
    if (!nome) continue;
    const key = clinicaFiltroKey(nome);
    if (byKey.has(key)) continue;
    byKey.set(key, { value: nome, label: nome });
  }

  return Array.from(byKey.values()).sort((a, b) =>
    compareByLabel(a.label, b.label)
  );
}

export function filterClinicaFilterOptions(
  options: readonly ClinicaFilterOption[],
  query: string
): ClinicaFilterOption[] {
  return options.filter((option) => textMatchesSearch(option.label, query));
}
