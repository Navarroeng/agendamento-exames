import { buscarContratoAtivo } from "@/services/cliente-contrato.service";
import { listarClientes } from "@/services/cliente.service";

export const CONTRATO_VIGENTE_ERROR_MESSAGE =
  "Cliente sem contrato vigente. Não é possível agendar exames até renovar o contrato.";

export type ContratoVigenciaResult = {
  vigente: boolean;
  dataInicio?: string;
  dataFim?: string;
  clienteId?: string;
};

function isDateWithinVigencia(
  dataAgendamento: string,
  dataInicio: string,
  dataFim: string
): boolean {
  return dataAgendamento >= dataInicio && dataAgendamento <= dataFim;
}

export async function verificarContratoVigente(
  clienteId: string,
  dataAgendamento: string
): Promise<ContratoVigenciaResult> {
  const contrato = await buscarContratoAtivo(clienteId);

  if (
    !contrato ||
    contrato.status !== "ativo" ||
    !contrato.data_inicio?.trim() ||
    !contrato.data_fim?.trim()
  ) {
    return { vigente: false, clienteId };
  }

  const vigente = isDateWithinVigencia(
    dataAgendamento,
    contrato.data_inicio,
    contrato.data_fim
  );

  return {
    vigente,
    dataInicio: contrato.data_inicio,
    dataFim: contrato.data_fim,
    clienteId,
  };
}

export async function verificarContratoVigentePorNome(
  clienteNome: string,
  dataAgendamento: string
): Promise<ContratoVigenciaResult> {
  const nome = clienteNome.trim();
  if (!nome) {
    return { vigente: false };
  }

  const clientes = await listarClientes(500);
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
