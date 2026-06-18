import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import { registrarAuditoria } from "@/services/auditoria.service";

export async function registrarExamesCarregadosPorCargo(
  context: AuditoriaUsuarioContext,
  params: {
    cargoNome: string;
    exames: string[];
    colaborador?: string | null;
    agendamentoId?: string | null;
  }
): Promise<void> {
  const lista = params.exames.join(", ");
  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.exames_carregados_cargo,
    registroId: params.agendamentoId ?? null,
    registroNome: params.colaborador ?? params.cargoNome,
    descricao: `${context.usuarioNome} carregou exames do cargo ${params.cargoNome}: ${lista}.`,
    dadosDepois: {
      cargo: params.cargoNome,
      exames: params.exames,
    },
  });
}

export async function registrarExameRemovidoAgendamento(
  context: AuditoriaUsuarioContext,
  params: {
    exameNome: string;
    cargoNome?: string | null;
    colaborador?: string | null;
    agendamentoId?: string | null;
  }
): Promise<void> {
  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.exame_removido_agendamento,
    registroId: params.agendamentoId ?? null,
    registroNome: params.colaborador ?? params.exameNome,
    descricao: `${context.usuarioNome} removeu o exame ${params.exameNome} do agendamento.`,
    dadosDepois: {
      exame: params.exameNome,
      cargo: params.cargoNome ?? null,
    },
  });
}

export async function registrarCargoAlteradoExamesRecalculados(
  context: AuditoriaUsuarioContext,
  params: {
    cargoAnterior: string;
    cargoNovo: string;
    exames: string[];
    colaborador?: string | null;
    agendamentoId?: string | null;
  }
): Promise<void> {
  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.cargo_alterado_exames_recalculados,
    registroId: params.agendamentoId ?? null,
    registroNome: params.colaborador ?? params.cargoNovo,
    descricao:
      `${context.usuarioNome} alterou o cargo de ${params.cargoAnterior} para ` +
      `${params.cargoNovo} e recalculou os exames: ${params.exames.join(", ")}.`,
    dadosDepois: {
      cargo_anterior: params.cargoAnterior,
      cargo_novo: params.cargoNovo,
      exames: params.exames,
    },
  });
}
