import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import {
  exigeMotivoClinicoZeroDemissional,
} from "@/lib/agendamento-clinico-zero-demissional";
import { isExameClinicoManual } from "@/lib/exame-pricing";
import type { AgendamentoWithExames, ExameFormItem } from "@/lib/types";
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

export async function registrarExamesComplementaresRemovidosRetornoTrabalho(
  context: AuditoriaUsuarioContext,
  params: {
    colaborador?: string | null;
    agendamentoId?: string | null;
  }
): Promise<void> {
  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.exames_complementares_removidos_retorno_trabalho,
    registroId: params.agendamentoId ?? null,
    registroNome: params.colaborador ?? null,
    descricao:
      "Exames complementares removidos automaticamente porque o ASO selecionado é Retorno ao Trabalho.",
  });
}

export async function registrarClinicoZeroDemissional(
  context: AuditoriaUsuarioContext,
  params: {
    motivo: string;
    colaborador?: string | null;
    agendamentoId?: string | null;
  }
): Promise<void> {
  await registrarAuditoria({
    usuarioId: context.usuarioId,
    usuarioNome: context.usuarioNome,
    usuarioEmail: context.usuarioEmail,
    modulo: AUDITORIA_MODULOS.agendamentos,
    acao: AUDITORIA_ACOES.clinico_zero_demissional,
    registroId: params.agendamentoId ?? null,
    registroNome: params.colaborador ?? null,
    descricao: `Exame Clínico do ASO Demissional salvo com valor cliente R$ 0,00. Motivo: ${params.motivo.trim()}.`,
    dadosDepois: {
      motivo: params.motivo.trim(),
    },
  });
}

export async function auditarClinicoZeroDemissionalSeNecessario(
  context: AuditoriaUsuarioContext,
  params: {
    aso: string;
    exams: ExameFormItem[];
    anterior: AgendamentoWithExames | null;
    agendamentoId: string;
    colaborador: string;
  }
): Promise<void> {
  const clinico = params.exams.find((exam) =>
    exigeMotivoClinicoZeroDemissional(params.aso, exam)
  );
  if (!clinico) return;

  const motivo = clinico.motivo_valor_zero?.trim();
  if (!motivo) return;

  const anteriorClinico = params.anterior?.agendamento_exames?.find((exam) =>
    isExameClinicoManual(exam.tipo_exame)
  );
  const motivoAnterior = anteriorClinico?.motivo_valor_zero?.trim() ?? "";

  if (!params.anterior || motivo !== motivoAnterior) {
    await registrarClinicoZeroDemissional(context, {
      motivo,
      agendamentoId: params.agendamentoId,
      colaborador: params.colaborador,
    });
  }
}
