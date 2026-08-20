/**
 * Cancelamento lógico do processo de Riscos Psicossociais (listagem).
 * Não exclui dados. Tracking.status = cancelado prevalece sobre o sincronismo.
 */
import { isOrigemManualCliente } from "@/lib/riscos-campanha-origem";
import { validateMotivoCancelamento } from "@/lib/riscos-campanha";

export const MSG_PROCESSO_RISCOS_CANCELADO =
  "Este processo de Riscos Psicossociais está cancelado. O histórico permanece disponível somente para consulta.";

export const MSG_PROCESSO_RISCOS_JA_CANCELADO =
  "Este processo já está cancelado.";

export const MSG_PROCESSO_RISCOS_JA_CONCLUIDO =
  "Processo concluído não pode ser cancelado.";

export type RiscosProcessoCancelamento = {
  canceladoEm: string | null;
  canceladoPor: string | null;
  motivoCancelamento: string | null;
};

export function isTrackingRiscosCancelado(
  tracking: { status?: string | null } | null | undefined
): boolean {
  return String(tracking?.status ?? "") === "cancelado";
}

/**
 * Automático: só o tracking do orçamento cancela o processo
 * (campanha cancelada sozinha ainda permite nova pesquisa).
 * Manual: a campanha é o processo — cancelada conta mesmo sem coluna nova.
 */
export function isProcessoRiscosCancelado(input: {
  origem?: string | null;
  trackingStatus?: string | null;
  campanhaStatus?: string | null;
}): boolean {
  if (String(input.trackingStatus ?? "") === "cancelado") return true;
  if (
    isOrigemManualCliente(input.origem) &&
    String(input.campanhaStatus ?? "") === "cancelada"
  ) {
    return true;
  }
  return false;
}

export function processoRiscosPermiteAvancar(input: {
  status?: string | null;
  etapaAtual?: string | null;
  origem?: string | null;
  trackingStatus?: string | null;
  campanhaStatus?: string | null;
}): boolean {
  if (String(input.status ?? "") === "cancelado") return false;
  if (String(input.etapaAtual ?? "") === "cancelado") return false;
  return !isProcessoRiscosCancelado(input);
}

export function validateCancelarProcessoListagem(input: {
  status?: string | null;
  etapaAtual?: string | null;
  motivo: string;
}): string | null {
  if (
    String(input.status ?? "") === "cancelado" ||
    String(input.etapaAtual ?? "") === "cancelado"
  ) {
    return MSG_PROCESSO_RISCOS_JA_CANCELADO;
  }
  if (
    String(input.status ?? "") === "concluido" ||
    String(input.etapaAtual ?? "") === "finalizado"
  ) {
    return MSG_PROCESSO_RISCOS_JA_CONCLUIDO;
  }
  return validateMotivoCancelamento(input.motivo);
}

/**
 * Campanha em preparação ou aberta não pode continuar recebendo respostas.
 * Encerrada permanece encerrada. Cancelada permanece cancelada.
 */
export function deveCancelarCampanhaVinculada(
  status: string | null | undefined
): boolean {
  const s = String(status ?? "");
  return s === "em_preparacao" || s === "aberta";
}

/** Linha já persistida (inclusive cancelada) nunca é reinserida pelo sincronismo. */
export function deveInserirTrackingRiscosNoSincronismo(
  elegivel: boolean,
  trackingExistente: { status?: string | null } | null | undefined
): boolean {
  if (trackingExistente) return false;
  return elegivel;
}

/**
 * Identidade para POST /api/riscos/processo/cancelar.
 * Automático: orcamento_id (campanha é opcional).
 * Manual: campanha.id / processoKey — nunca o stub `manual:`.
 */
export function identidadeCancelamentoProcessoRiscos(input: {
  origem?: string | null;
  processoKey?: string | null;
  orcamentoId?: string | null;
  campanhaId?: string | null;
}): { orcamentoId?: string; campanhaId?: string } {
  const campanhaId = String(input.campanhaId ?? "").trim();
  const orcamentoRaw = String(input.orcamentoId ?? "").trim();
  const orcamentoId =
    orcamentoRaw && !orcamentoRaw.startsWith("manual:") ? orcamentoRaw : "";

  if (isOrigemManualCliente(input.origem)) {
    const id = campanhaId || String(input.processoKey ?? "").trim();
    return id ? { campanhaId: id } : {};
  }

  const out: { orcamentoId?: string; campanhaId?: string } = {};
  if (orcamentoId) out.orcamentoId = orcamentoId;
  if (campanhaId) out.campanhaId = campanhaId;
  return out;
}

export function resolverCancelamentoProcessoRiscos(input: {
  tracking?: {
    status?: string | null;
    cancelado_em?: string | null;
    cancelado_por?: string | null;
    motivo_cancelamento?: string | null;
  } | null;
  campanha?: {
    status?: string | null;
    cancelada_em?: string | null;
    cancelada_por?: string | null;
    motivo_cancelamento?: string | null;
  } | null;
  origem?: string | null;
}): RiscosProcessoCancelamento & { cancelado: boolean } {
  const cancelado = isProcessoRiscosCancelado({
    origem: input.origem,
    trackingStatus: input.tracking?.status,
    campanhaStatus: input.campanha?.status,
  });
  if (!cancelado) {
    return {
      cancelado: false,
      canceladoEm: null,
      canceladoPor: null,
      motivoCancelamento: null,
    };
  }
  return {
    cancelado: true,
    canceladoEm:
      input.tracking?.cancelado_em ?? input.campanha?.cancelada_em ?? null,
    canceladoPor:
      input.tracking?.cancelado_por ?? input.campanha?.cancelada_por ?? null,
    motivoCancelamento:
      input.tracking?.motivo_cancelamento ??
      input.campanha?.motivo_cancelamento ??
      null,
  };
}
