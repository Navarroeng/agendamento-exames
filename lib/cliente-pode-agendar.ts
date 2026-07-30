import type { ClienteContratoRecord } from "@/lib/types";

export type ContratoParaAgendamento = Pick<
  ClienteContratoRecord,
  | "orcamento_id"
  | "boleto_pago"
  | "liberado_para_agendamento"
  | "status"
>;

export type ClienteParaAgendamento = {
  disponivel_agendamento?: boolean | null;
};

/**
 * Regra única de liberação para agendamento (badge / disponibilidade).
 * - encerrado/cancelado → bloqueado;
 * - originado de orçamento → boleto_pago = true;
 * - manual → liberado_para_agendamento.
 *
 * Vigência (data do exame) é validada em contratoEstaVigenteNaData no ato de agendar.
 */
export function contratoLiberaAgendamento(
  contrato: ContratoParaAgendamento
): boolean {
  if (contrato.status === "encerrado" || contrato.status === "cancelado") {
    return false;
  }
  if (contrato.orcamento_id) {
    return contrato.boleto_pago === true;
  }
  return contrato.liberado_para_agendamento === true;
}

/**
 * Cliente pode agendar se algum contrato libera,
 * ou (sem contratos de orçamento) se o flag legado permitir.
 */
export function clientePodeAgendar(
  cliente: ClienteParaAgendamento,
  contratos: ContratoParaAgendamento[]
): boolean {
  if (contratos.some((c) => contratoLiberaAgendamento(c))) {
    return true;
  }

  const temContratoOrcamento = contratos.some((c) => Boolean(c.orcamento_id));
  if (temContratoOrcamento) {
    return false;
  }

  return cliente.disponivel_agendamento !== false;
}

export function labelAgendamentoLiberacao(
  liberado: boolean
): "Liberado" | "Bloqueado" {
  return liberado ? "Liberado" : "Bloqueado";
}
