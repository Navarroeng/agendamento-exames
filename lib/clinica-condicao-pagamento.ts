/** Condição de pagamento da clínica com a Navarro. */
export const CONDICAO_PAGAMENTO_FECHAMENTO_MENSAL = "fechamento_mensal";
export const CONDICAO_PAGAMENTO_A_VISTA = "a_vista";

export type CondicaoPagamentoClinica =
  | typeof CONDICAO_PAGAMENTO_FECHAMENTO_MENSAL
  | typeof CONDICAO_PAGAMENTO_A_VISTA;

export const SELO_PAGAMENTO_A_VISTA = "Pagamento à vista";

/**
 * Ausência e qualquer valor desconhecido permanecem no fechamento mensal.
 * Não classifica clínica pelo nome.
 */
export function condicaoPagamentoClinicaEfetiva(
  valor: string | null | undefined
): CondicaoPagamentoClinica {
  return valor === CONDICAO_PAGAMENTO_A_VISTA
    ? CONDICAO_PAGAMENTO_A_VISTA
    : CONDICAO_PAGAMENTO_FECHAMENTO_MENSAL;
}

export function pagamentoClinicaAvista(
  valor: string | null | undefined
): boolean {
  return valor === CONDICAO_PAGAMENTO_A_VISTA;
}

export function rotuloCondicaoPagamentoClinica(
  valor: string | null | undefined
): string {
  return pagamentoClinicaAvista(valor) ? "À vista" : "Fechamento mensal";
}

/**
 * O agendamento entra no fechamento mensal quando a condição gravada
 * não é à vista. Registro legado (null) conta como fechamento mensal.
 */
export function agendamentoEntraNoFechamentoMensalClinica(agendamento: {
  condicao_pagamento_clinica?: string | null;
}): boolean {
  return !pagamentoClinicaAvista(agendamento.condicao_pagamento_clinica);
}

export function filtrarAgendamentosFechamentoMensalClinica<
  T extends { condicao_pagamento_clinica?: string | null },
>(agendamentos: T[]): T[] {
  return agendamentos.filter(agendamentoEntraNoFechamentoMensalClinica);
}
