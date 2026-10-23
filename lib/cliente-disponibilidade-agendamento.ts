/**
 * Regra central de disponibilidade para novos agendamentos.
 *
 * Fonte única usada por:
 * - badge na tela Clientes;
 * - bloqueio no Novo Agendamento;
 * - recompute no banco (espelhado em migration).
 *
 * Não duplicar esta lógica em telas.
 */

import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  CONTRATO_ENCERRADO_ERROR_MESSAGE,
  CONTRATO_VIGENTE_ERROR_MESSAGE,
  contratoEstaVigenteNaData,
} from "@/lib/cliente-contrato-vigencia";
import type { ClienteContratoRecord } from "@/lib/types";

export const BLOQUEIO_MANUAL_AGENDAMENTO_MSG =
  "Este cliente está bloqueado manualmente para novos agendamentos.";

export type ClienteParaDisponibilidadeAgendamento = {
  disponivel_agendamento?: boolean | null;
  agendamento_bloqueio_manual?: boolean | null;
  agendamento_bloqueio_motivo?: string | null;
};

export type ContratoParaDisponibilidadeAgendamento = Pick<
  ClienteContratoRecord,
  "status" | "orcamento_id" | "boleto_pago" | "liberado_para_agendamento"
> &
  Partial<
    Pick<
      ClienteContratoRecord,
      | "id"
      | "data_inicio"
      | "data_fim"
      | "encerrado_em"
      | "tipo_contrato"
      | "condicao_pagamento"
      | "contrato_assinado_em"
    >
  > & {
    modalidadeOrcamento?: string | null;
    mensalidadePagamento?: string | null;
    contrato_assinado?: boolean | null;
  };

export type DisponibilidadeAgendamentoResult = {
  disponivel: boolean;
  /** Motivo quando indisponível; null quando liberado. */
  motivo: string | null;
  label: "Agendamento liberado" | "Agendamento bloqueado";
};

function hojeIso(data?: string): string {
  return (data ?? todayIsoSaoPaulo()).slice(0, 10);
}

/**
 * Determina se o cliente pode receber novos agendamentos na data.
 * Prioridade: bloqueio manual → vigência efetiva → bloqueado.
 *
 * A vigência efetiva é a janela já reconhecida em data_inicio/data_fim
 * (e o status operacional), a mesma que o card usa para Ativo ou Expirado.
 * Gestão SST mensal e contrato em renovação continuam liberados enquanto
 * essa janela cobre a data — a falta de um novo registro de renovação não
 * encerra a vigência. Um contrato seguinte só libera quando a data de
 * início dele já chegou. O flag disponivel_agendamento não entra na conta:
 * ele é cache e fica desatualizado depois que a data de fim passa.
 */
export function resolveDisponibilidadeAgendamentoCliente(input: {
  cliente: ClienteParaDisponibilidadeAgendamento;
  contratos: ContratoParaDisponibilidadeAgendamento[];
  /** YYYY-MM-DD; padrão = hoje. */
  dataReferenciaIso?: string;
}): DisponibilidadeAgendamentoResult {
  const data = hojeIso(input.dataReferenciaIso);

  if (input.cliente.agendamento_bloqueio_manual === true) {
    const motivo =
      input.cliente.agendamento_bloqueio_motivo?.trim() ||
      BLOQUEIO_MANUAL_AGENDAMENTO_MSG;
    return {
      disponivel: false,
      motivo,
      label: "Agendamento bloqueado",
    };
  }

  const vigente = input.contratos.find((c) =>
    contratoEstaVigenteNaData(c, data)
  );
  if (vigente) {
    return {
      disponivel: true,
      motivo: null,
      label: "Agendamento liberado",
    };
  }

  const aberto = input.contratos.some(
    (c) =>
      c.status !== "encerrado" &&
      c.status !== "cancelado" &&
      !c.encerrado_em
  );
  const encerrado = input.contratos.find(
    (c) =>
      c.status === "encerrado" ||
      c.status === "cancelado" ||
      Boolean(c.encerrado_em)
  );
  if (encerrado && !aberto) {
    return {
      disponivel: false,
      motivo: CONTRATO_ENCERRADO_ERROR_MESSAGE,
      label: "Agendamento bloqueado",
    };
  }

  // Sem contrato vigente (vencido, aguardando, sem contrato, etc.)
  return {
    disponivel: false,
    motivo: CONTRATO_VIGENTE_ERROR_MESSAGE,
    label: "Agendamento bloqueado",
  };
}

/** Atalho booleano da regra central. */
export function clienteDisponivelParaAgendamento(input: {
  cliente: ClienteParaDisponibilidadeAgendamento;
  contratos: ContratoParaDisponibilidadeAgendamento[];
  dataReferenciaIso?: string;
}): boolean {
  return resolveDisponibilidadeAgendamentoCliente(input).disponivel;
}
