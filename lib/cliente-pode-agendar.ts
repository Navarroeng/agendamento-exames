import type { ClienteContratoRecord } from "@/lib/types";
import {
  clienteDisponivelParaAgendamento,
  resolveDisponibilidadeAgendamentoCliente,
} from "@/lib/cliente-disponibilidade-agendamento";

export type ContratoParaAgendamento = Pick<
  ClienteContratoRecord,
  | "orcamento_id"
  | "boleto_pago"
  | "liberado_para_agendamento"
  | "status"
> &
  Partial<
    Pick<ClienteContratoRecord, "id" | "data_inicio" | "data_fim" | "encerrado_em">
  >;

export type ClienteParaAgendamento = {
  disponivel_agendamento?: boolean | null;
  agendamento_bloqueio_manual?: boolean | null;
  agendamento_bloqueio_motivo?: string | null;
};

/**
 * Liberação financeira/status (sem vigência de datas).
 * Para disponibilidade completa use resolveDisponibilidadeAgendamentoCliente.
 */
export function contratoLiberaAgendamento(
  contrato: ContratoParaAgendamento
): boolean {
  if (contrato.status === "encerrado" || contrato.status === "cancelado") {
    return false;
  }
  if (contrato.status !== "ativo" && contrato.status !== "em_renovacao") {
    return false;
  }
  if (contrato.orcamento_id) {
    return contrato.boleto_pago === true;
  }
  return contrato.liberado_para_agendamento === true;
}

/**
 * Regra central (boolean): delega para resolveDisponibilidadeAgendamentoCliente.
 * Exige contratos com datas para avaliar vigência.
 */
export function clientePodeAgendar(
  cliente: ClienteParaAgendamento,
  contratos: ContratoParaAgendamento[],
  dataReferenciaIso?: string
): boolean {
  return clienteDisponivelParaAgendamento({
    cliente,
    contratos,
    dataReferenciaIso,
  });
}

export function labelAgendamentoLiberacao(
  liberado: boolean
): "Liberado" | "Bloqueado" {
  return liberado ? "Liberado" : "Bloqueado";
}

export { resolveDisponibilidadeAgendamentoCliente };
