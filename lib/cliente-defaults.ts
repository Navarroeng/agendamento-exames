import { CLIENTE_PROCURACAO_INATIVA } from "@/lib/cliente-procuracao";
import { boolToDisponivelAgendamentoForm } from "@/lib/cliente-disponivel-agendamento";
import type { ClienteFormValues } from "@/lib/types";

export function getEmptyClienteForm(): ClienteFormValues {
  return {
    nome: "",
    cnpj: "",
    procuracao: CLIENTE_PROCURACAO_INATIVA,
    disponivel_agendamento: boolToDisponivelAgendamentoForm(true),
  };
}
