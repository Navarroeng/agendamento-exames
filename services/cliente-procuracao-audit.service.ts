import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { formatClienteProcuracaoLabel } from "@/lib/cliente-procuracao";
import type { ClienteProcuracao } from "@/lib/types";
import { registrarAuditoria } from "@/services/auditoria.service";

export async function registrarDisponivelAgendamentoClienteAlterada(
  context: AuditoriaUsuarioContext,
  params: {
    clienteId: string;
    clienteNome: string;
    disponivelAnterior: boolean;
    disponivelNova: boolean;
  }
): Promise<void> {
  const liberou = params.disponivelNova;
  const acao = liberou
    ? AUDITORIA_ACOES.agendamento_cliente_liberado
    : AUDITORIA_ACOES.agendamento_cliente_bloqueado;

  const descricao = liberou
    ? `${context.usuarioNome} liberou o cliente ${params.clienteNome} para agendamentos.`
    : `${context.usuarioNome} bloqueou o cliente ${params.clienteNome} para novos agendamentos.`;

  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.clientes,
    acao,
    registroId: params.clienteId,
    registroNome: params.clienteNome,
    descricao,
    dadosAntes: { disponivel_agendamento: params.disponivelAnterior },
    dadosDepois: { disponivel_agendamento: params.disponivelNova },
  });
}

export async function registrarProcuracaoClienteAlterada(
  context: AuditoriaUsuarioContext,
  params: {
    clienteId: string;
    clienteNome: string;
    procuracaoAnterior: ClienteProcuracao;
    procuracaoNova: ClienteProcuracao;
  }
): Promise<void> {
  const anterior = formatClienteProcuracaoLabel(params.procuracaoAnterior);
  const nova = formatClienteProcuracaoLabel(params.procuracaoNova);

  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.clientes,
    acao: AUDITORIA_ACOES.procuracao_alterada,
    registroId: params.clienteId,
    registroNome: params.clienteNome,
    descricao:
      `${context.usuarioNome} alterou a procuração do cliente ${params.clienteNome} ` +
      `de ${anterior} para ${nova}.`,
    dadosAntes: { procuracao: params.procuracaoAnterior },
    dadosDepois: { procuracao: params.procuracaoNova },
  });
}

export async function registrarAgendamentoClienteSemProcuracao(
  context: AuditoriaUsuarioContext,
  params: {
    clienteId: string;
    clienteNome: string;
    agendamentoId?: string | null;
    colaborador?: string | null;
  }
): Promise<void> {
  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.agendamento_sem_procuracao_confirmado,
    registroId: params.agendamentoId ?? params.clienteId,
    registroNome: params.colaborador ?? params.clienteNome,
    descricao:
      `${context.usuarioNome} confirmou agendamento para o cliente ${params.clienteNome} ` +
      "sem procuração ativa.",
    dadosDepois: {
      cliente_id: params.clienteId,
      cliente_nome: params.clienteNome,
    },
  });
}
