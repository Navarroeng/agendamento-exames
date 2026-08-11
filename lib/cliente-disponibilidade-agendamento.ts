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
      "id" | "data_inicio" | "data_fim" | "encerrado_em"
    >
  >;

export type DisponibilidadeAgendamentoResult = {
  disponivel: boolean;
  /** Motivo quando indisponível; null quando liberado. */
  motivo: string | null;
  label: "Agendamento liberado" | "Agendamento bloqueado";
};

function hojeIso(data?: string): string {
  return (data ?? new Date().toISOString()).slice(0, 10);
}

/**
 * Determina se o cliente pode receber novos agendamentos na data.
 * Prioridade: bloqueio manual → contrato vigente → bloqueado.
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

  const encerrado = input.contratos.find(
    (c) =>
      c.status === "encerrado" ||
      c.status === "cancelado" ||
      Boolean(c.encerrado_em)
  );
  if (encerrado) {
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
