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
