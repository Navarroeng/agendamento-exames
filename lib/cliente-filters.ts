export const CLIENTES_PAGE_SIZE = 30;

export interface ClientesListFilters {
  busca: string;
}

export const EMPTY_CLIENTES_LIST_FILTERS: ClientesListFilters = {
  busca: "",
};

export function hasActiveClientesListFilters(
  filters: ClientesListFilters
): boolean {
  return filters.busca.trim() !== "";
}
