/**
 * Bloqueio manual de novos agendamentos (prioridade sobre automático).
 */
export type ClienteBloqueioManualFields = {
  disponivel_agendamento: boolean;
  agendamento_bloqueio_manual: boolean;
  agendamento_bloqueio_motivo: string | null;
  agendamento_bloqueado_em: string | null;
  agendamento_bloqueado_por: string | null;
};

export const BLOQUEIO_MANUAL_RESTAURADO_MOTIVO =
  "Bloqueio manual restaurado após identificação de sobrescrita automática.";

export function isClienteBloqueioManual(cliente: {
  agendamento_bloqueio_manual?: boolean | null;
}): boolean {
  return cliente.agendamento_bloqueio_manual === true;
}

/** Campos a gravar ao aplicar/remover bloqueio manual via edição do cliente. */
export function buildCamposBloqueioManualAgendamento(params: {
  disponivelNova: boolean;
  manualAnterior: boolean;
  bloqueadoEmAnterior?: string | null;
  bloqueadoPorAnterior?: string | null;
  motivoAnterior?: string | null;
  motivo?: string | null;
  usuarioNome?: string | null;
  agoraIso?: string;
}): ClienteBloqueioManualFields {
  const agora = params.agoraIso ?? new Date().toISOString();
  const motivo = (params.motivo ?? "").trim();

  if (!params.disponivelNova) {
    return {
      disponivel_agendamento: false,
      agendamento_bloqueio_manual: true,
      agendamento_bloqueio_motivo:
        motivo ||
        (params.motivoAnterior ?? "").trim() ||
        "Bloqueio manual para novos agendamentos.",
      agendamento_bloqueado_em: params.manualAnterior
        ? (params.bloqueadoEmAnterior ?? agora)
        : agora,
      agendamento_bloqueado_por: params.manualAnterior
        ? (params.bloqueadoPorAnterior ?? params.usuarioNome?.trim() ?? null)
        : (params.usuarioNome?.trim() || null),
    };
  }

  return {
    disponivel_agendamento: true,
    agendamento_bloqueio_manual: false,
    agendamento_bloqueio_motivo: motivo || null,
    agendamento_bloqueado_em: null,
    agendamento_bloqueado_por: null,
  };
}
