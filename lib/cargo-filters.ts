import { textsMatchSearch } from "@/lib/text-normalize";
import type { CargoRecord } from "@/lib/types";

export interface CargosListFilters {
  busca: string;
}

export const EMPTY_CARGOS_LIST_FILTERS: CargosListFilters = {
  busca: "",
};

export function hasActiveCargosListFilters(filters: CargosListFilters): boolean {
  return filters.busca.trim() !== "";
}

export function filterCargos(
  cargos: CargoRecord[],
  filters: CargosListFilters
): CargoRecord[] {
  const busca = filters.busca.trim();
  if (!busca) return cargos;

  return cargos.filter((cargo) =>
    textsMatchSearch([cargo.nome, cargo.descricao ?? ""], busca)
  );
}
