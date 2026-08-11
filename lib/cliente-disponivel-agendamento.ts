/**
 * Disponibilidade para novos agendamentos — labels e filtros de UI.
 *
 * A regra de negócio (liberado/bloqueado + motivo) vive em
 * `lib/cliente-disponibilidade-agendamento.ts` (`resolveDisponibilidadeAgendamentoCliente`).
 * O flag `clientes.disponivel_agendamento` é cache mantido por
 * `recompute_cliente_disponivel_agendamento` (mesma regra no banco).
 */
import { SIM_NAO } from "@/lib/constants";
import type { DisponibilidadeAgendamentoResult } from "@/lib/cliente-disponibilidade-agendamento";

export const CLIENTE_DISPONIVEL_AGENDAMENTO_MSG =
  "Este cliente não está autorizado para novos agendamentos.";

export const CLIENTE_AGENDAMENTO_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "liberado", label: "Liberados para agendamento" },
  { value: "bloqueado", label: "Bloqueados para agendamento" },
] as const;

export type ClienteAgendamentoFilter =
  (typeof CLIENTE_AGENDAMENTO_FILTER_OPTIONS)[number]["value"];

export function isClienteDisponivelAgendamento(
  value: boolean | null | undefined
): boolean {
  return value === true;
}

export function boolToDisponivelAgendamentoForm(
  value: boolean | null | undefined
): (typeof SIM_NAO)[number] {
  return isClienteDisponivelAgendamento(value) ? "Sim" : "Não";
}

export function formToDisponivelAgendamento(value: string): boolean {
  return value.trim().toLowerCase() === "sim";
}

export function formatClienteAgendamentoBadgeLabel(
  value: boolean | null | undefined
): "Agendamento liberado" | "Agendamento bloqueado" {
  return isClienteDisponivelAgendamento(value)
    ? "Agendamento liberado"
    : "Agendamento bloqueado";
}

/** Prefere o resultado da regra central quando disponível. */
export function formatDisponibilidadeAgendamentoLabel(
  result: Pick<DisponibilidadeAgendamentoResult, "label"> | boolean | null | undefined
): "Agendamento liberado" | "Agendamento bloqueado" {
  if (typeof result === "object" && result && "label" in result) {
    return result.label;
  }
  return formatClienteAgendamentoBadgeLabel(result as boolean | null | undefined);
}

export function matchesClienteAgendamentoFilter(
  record: Pick<{ disponivel_agendamento?: boolean | null }, "disponivel_agendamento">,
  filter: ClienteAgendamentoFilter
): boolean {
  if (!filter) return true;
  const disponivel = isClienteDisponivelAgendamento(record.disponivel_agendamento);
  if (filter === "liberado") return disponivel;
  if (filter === "bloqueado") return !disponivel;
  return true;
}

export function filterClientesParaNovoAgendamento<
  T extends { id: string; nome: string; disponivel_agendamento?: boolean | null },
>(
  clientes: T[],
  options?: {
    editingId?: string | null;
    clienteNomeAtual?: string;
  }
): T[] {
  const nomeAtual = options?.clienteNomeAtual?.trim() ?? "";
  const isEditing = Boolean(options?.editingId);

  return clientes.filter((cliente) => {
    if (isClienteDisponivelAgendamento(cliente.disponivel_agendamento)) {
      return true;
    }
    if (
      isEditing &&
      nomeAtual &&
      cliente.nome.trim().toLowerCase() === nomeAtual.toLowerCase()
    ) {
      return true;
    }
    return false;
  });
}
