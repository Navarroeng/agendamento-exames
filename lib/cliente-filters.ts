import type { ClienteAgendamentoFilter } from "@/lib/cliente-disponivel-agendamento";

export const CLIENTES_PAGE_SIZE = 30;

export interface ClientesListFilters {
  busca: string;
  agendamento: ClienteAgendamentoFilter;
}

export const EMPTY_CLIENTES_LIST_FILTERS: ClientesListFilters = {
  busca: "",
  agendamento: "",
};

export function hasActiveClientesListFilters(
  filters: ClientesListFilters
): boolean {
  return filters.busca.trim() !== "" || filters.agendamento !== "";
}
