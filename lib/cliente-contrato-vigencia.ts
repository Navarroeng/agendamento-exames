import {
  buscarContratoAtivo,
  listarContratosPorCliente,
} from "@/services/cliente-contrato.service";
import { listarClientesParaSelect } from "@/services/cliente.service";
import { contratoLiberaAgendamento } from "@/lib/cliente-pode-agendar";
import type { ClienteContratoRecord } from "@/lib/types";

export const CONTRATO_VIGENTE_ERROR_MESSAGE =
  "Cliente sem contrato vigente. Não é possível agendar exames até renovar o contrato.";

export type ContratoVigenciaResult = {
  vigente: boolean;
  dataInicio?: string;
  dataFim?: string;
  clienteId?: string;
  contratoId?: string;
};

function isDateWithinVigencia(
  dataAgendamento: string,
  dataInicio: string,
  dataFim: string
): boolean {
  return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
}

/**
 * Regra única: contrato vigente para agendar na data.
 * - status ativo (ou em renovação);
 * - não cancelado/encerrado;
 * - data_inicio/data_fim preenchidas e contendo a data;
 * - liberado para agendamento (boleto pago nos de orçamento).
 */
export function contratoEstaVigenteNaData(
  contrato: Pick<
    ClienteContratoRecord,
    | "id"
    | "status"
    | "data_inicio"
    | "data_fim"
    | "orcamento_id"
    | "boleto_pago"
    | "liberado_para_agendamento"
  >,
  dataAgendamento: string
): boolean {
  if (contrato.status === "cancelado" || contrato.status === "encerrado") {
    return false;
  }
  if (contrato.status !== "ativo" && contrato.status !== "em_renovacao") {
    return false;
  }
  const inicio = contrato.data_inicio?.trim() ?? "";
  const fim = contrato.data_fim?.trim() ?? "";
  if (!inicio || !fim) return false;
  if (!isDateWithinVigencia(dataAgendamento, inicio, fim)) return false;
  if (!contratoLiberaAgendamento(contrato)) return false;
  return true;
}

export async function verificarContratoVigente(
  clienteId: string,
  dataAgendamento: string
): Promise<ContratoVigenciaResult> {
  const contratos = await listarContratosPorCliente(clienteId);

  const vigente = contratos.find((c) =>
    contratoEstaVigenteNaData(c, dataAgendamento)
  );
  if (vigente) {
    return {
      vigente: true,
      dataInicio: vigente.data_inicio,
      dataFim: vigente.data_fim ?? undefined,
      clienteId,
      contratoId: vigente.id,
    };
  }

  // Fallback: único ativo com datas (compatível com busca antiga)
  const contratoAtivo = await buscarContratoAtivo(clienteId);
  if (
    contratoAtivo &&
    contratoEstaVigenteNaData(contratoAtivo, dataAgendamento)
  ) {
    return {
      vigente: true,
      dataInicio: contratoAtivo.data_inicio,
      dataFim: contratoAtivo.data_fim ?? undefined,
      clienteId,
      contratoId: contratoAtivo.id,
    };
  }

  return { vigente: false, clienteId };
}

export async function verificarContratoVigentePorNome(
  clienteNome: string,
  dataAgendamento: string
): Promise<ContratoVigenciaResult> {
  const nome = clienteNome.trim();
  if (!nome) {
    return { vigente: false };
  }

  const clientes = await listarClientesParaSelect();
  const cliente = clientes.find(
    (c) => c.nome.trim().toLowerCase() === nome.toLowerCase()
  );

  if (!cliente) {
    return { vigente: false };
  }

  return verificarContratoVigente(cliente.id, dataAgendamento);
}

export async function assertContratoVigentePorNome(
  clienteNome: string,
  dataAgendamento: string
): Promise<void> {
  const result = await verificarContratoVigentePorNome(
    clienteNome,
    dataAgendamento
  );
  if (!result.vigente) {
    throw new Error(CONTRATO_VIGENTE_ERROR_MESSAGE);
  }
}
