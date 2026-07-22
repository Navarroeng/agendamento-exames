import { SIM_NAO } from "@/lib/constants";

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
  return value !== false;
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
    if (isEditing && nomeAtual && cliente.nome.trim() === nomeAtual) {
      return true;
    }
    return false;
  });
}
