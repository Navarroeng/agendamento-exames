import { PROCURACAO_STATUS_PENDENTE } from "@/lib/cliente-procuracao";
import { boolToDisponivelAgendamentoForm } from "@/lib/cliente-disponivel-agendamento";
import type { ClienteFormValues } from "@/lib/types";

export function getEmptyClienteForm(): ClienteFormValues {
  return {
    nome: "",
    cnpj: "",
    procuracao: PROCURACAO_STATUS_PENDENTE,
    disponivel_agendamento: boolToDisponivelAgendamentoForm(true),
  };
}
