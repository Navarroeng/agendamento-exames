import type { ClienteContratoRecord } from "@/lib/types";

export type ContratoParaAgendamento = Pick<
  ClienteContratoRecord,
  "orcamento_id" | "boleto_pago" | "liberado_para_agendamento"
>;

export type ClienteParaAgendamento = {
  disponivel_agendamento?: boolean | null;
};

/**
 * Regra única: um contrato libera agendamento quando
 * - manual (sem orcamento_id) e liberado_para_agendamento; ou
 * - originado de orçamento e boleto_pago = true.
 */
export function contratoLiberaAgendamento(
  contrato: ContratoParaAgendamento
): boolean {
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
