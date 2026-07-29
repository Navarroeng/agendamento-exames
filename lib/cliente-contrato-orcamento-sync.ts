import type { ClienteContratoStatus } from "@/lib/types";
import {
  calcularFimVigencia,
  MESES_VIGENCIA_PADRAO_ORCAMENTO,
  toIsoDateOnly,
} from "@/lib/cliente-contrato-vigencia-calc";

export type AprovacaoContratoSyncInput = {
  contrato_enviado: boolean;
  contrato_assinado: boolean;
  contrato_assinado_em: string | null;
  boleto_pago: boolean;
  boleto_vencimento: string | null;
};

/**
 * Status contratual (não financeiro).
 * Pagamento confirmado + assinado → ativo (nunca "pago" como status principal).
 */
export function resolveStatusContratoFromAprovacao(
  payload: Pick<
    AprovacaoContratoSyncInput,
    | "contrato_enviado"
    | "contrato_assinado"
    | "boleto_pago"
    | "boleto_vencimento"
  >
): ClienteContratoStatus {
  if (payload.boleto_pago && payload.contrato_assinado) {
    return "ativo";
  }
  if (payload.contrato_assinado) {
    return payload.boleto_vencimento
      ? "aguardando_pagamento"
      : "assinado";
  }
  if (payload.contrato_enviado) return "enviado";
  return "aguardando_envio";
}

export type ContratoOrcamentoSyncPayload = {
  status: ClienteContratoStatus;
  contrato_enviado_em?: string | null;
  contrato_assinado_em?: string | null;
  boleto_vencimento?: string | null;
  boleto_pago?: boolean;
  boleto_pago_em?: string | null;
  liberado_para_agendamento: boolean;
  data_inicio?: string;
  data_fim?: string;
  tipo_contrato?: "anual";
  meses_vigencia?: number;
};

/**
 * Monta o update de cliente_contratos a partir da aprovação.
 * Assinatura define vigência; pagamento define liberação + ativo.
 */
export function buildClienteContratoSyncFromAprovacao(params: {
  aprovacao: AprovacaoContratoSyncInput & {
    contrato_enviado_em?: string | null;
    boleto_pago_em?: string | null;
  };
  mesesVigencia?: number;
}): ContratoOrcamentoSyncPayload {
  const { aprovacao } = params;
  const meses =
    params.mesesVigencia ?? MESES_VIGENCIA_PADRAO_ORCAMENTO;
  const status = resolveStatusContratoFromAprovacao(aprovacao);
  const liberado =
    Boolean(aprovacao.boleto_pago) && Boolean(aprovacao.contrato_assinado);

  const payload: ContratoOrcamentoSyncPayload = {
    status,
    contrato_enviado_em: aprovacao.contrato_enviado_em ?? null,
    contrato_assinado_em: aprovacao.contrato_assinado_em,
    boleto_vencimento: aprovacao.boleto_vencimento,
    boleto_pago: aprovacao.boleto_pago,
    boleto_pago_em: aprovacao.boleto_pago_em ?? null,
    liberado_para_agendamento: liberado,
  };

  if (aprovacao.contrato_assinado) {
    const inicio = toIsoDateOnly(aprovacao.contrato_assinado_em);
    if (inicio) {
      payload.data_inicio = inicio;
      payload.data_fim = calcularFimVigencia(inicio, meses);
      payload.tipo_contrato = "anual";
      payload.meses_vigencia = meses;
    }
  }

  return payload;
}
