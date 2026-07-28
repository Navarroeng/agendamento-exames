import {
  buscarContratoAtivo,
  listarContratosPorCliente,
} from "@/services/cliente-contrato.service";
import { listarClientesParaSelect } from "@/services/cliente.service";
import { contratoLiberaAgendamento } from "@/lib/cliente-pode-agendar";

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
  const contratoAtivo = await buscarContratoAtivo(clienteId);

  if (
    contratoAtivo &&
    contratoAtivo.status === "ativo" &&
    contratoAtivo.data_inicio?.trim() &&
    contratoAtivo.data_fim?.trim()
  ) {
    const vigente = isDateWithinVigencia(
      dataAgendamento,
      contratoAtivo.data_inicio,
      contratoAtivo.data_fim
    );
    if (vigente) {
      return {
        vigente: true,
        dataInicio: contratoAtivo.data_inicio,
        dataFim: contratoAtivo.data_fim,
        clienteId,
      };
    }
  }

  // Contratos originados de orçamento liberados após pagamento inicial
  const contratos = await listarContratosPorCliente(clienteId);
  const liberado = contratos.find((c) =>
    contratoLiberaAgendamento({
      orcamento_id: c.orcamento_id,
      boleto_pago: c.boleto_pago,
      liberado_para_agendamento: c.liberado_para_agendamento,
    })
  );
  if (liberado) {
    return {
      vigente: true,
      dataInicio: liberado.data_inicio,
      dataFim: liberado.data_fim ?? undefined,
      clienteId,
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
