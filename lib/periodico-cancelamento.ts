import { isPerfilAdmin, type PerfilUsuarioTipo } from "@/lib/permissions";
import type { PeriodicoFuturoRecord, PeriodicoFuturoStoredStatus } from "@/lib/types";

export const PERIODICO_CANCELAR_SEM_PERMISSAO_MSG =
  "Somente administradores podem cancelar um periódico futuro.";

export const PERIODICO_CANCELAR_MOTIVO_MSG =
  "Informe o motivo do cancelamento deste periódico.";

export const PERIODICO_CANCELAR_JA_CANCELADO_MSG =
  "Este periódico futuro já está cancelado.";

export const PERIODICO_CANCELAR_AVISO_AGENDAMENTO_ATIVO =
  "Existe um agendamento ativo vinculado a este periódico. O cancelamento do periódico não cancela automaticamente o agendamento existente.";

export function validarMotivoCancelamentoPeriodico(
  motivo: string | null | undefined
): string | null {
  if (!(motivo ?? "").trim()) return PERIODICO_CANCELAR_MOTIVO_MSG;
  return null;
}

export function isPeriodicoCanceladoManualmente(
  record: Pick<
    PeriodicoFuturoRecord,
    "status" | "cancelado_em" | "motivo_cancelamento"
  >
): boolean {
  if (record.status !== "cancelado") return false;
  return Boolean(
    (record.cancelado_em ?? "").toString().trim() ||
      (record.motivo_cancelamento ?? "").trim()
  );
}

export function podeExibirCancelarPeriodicoGrupo(params: {
  isAdmin: boolean;
  temPeriodicoCancelavel: boolean;
  displayStatus: string;
}): boolean {
  return (
    params.isAdmin &&
    params.temPeriodicoCancelavel &&
    params.displayStatus !== "cancelado"
  );
}

export function podeExibirCancelarPeriodico(params: {
  isAdmin: boolean;
  status: PeriodicoFuturoStoredStatus | string;
  canceladoEm?: string | null;
  motivoCancelamento?: string | null;
}): boolean {
  if (!params.isAdmin) return false;
  if (
    isPeriodicoCanceladoManualmente({
      status: params.status as PeriodicoFuturoStoredStatus,
      cancelado_em: params.canceladoEm ?? null,
      motivo_cancelamento: params.motivoCancelamento ?? null,
    })
  ) {
    return false;
  }
  return params.status === "ativo" || params.status === "reagendado";
}

export function podeExecutarCancelarPeriodico(
  perfil: PerfilUsuarioTipo | null | undefined
): boolean {
  return isPerfilAdmin(perfil);
}

/** ASO cancelado: periódico de origem permanece aberto; cumprimento reagendado volta a pendente. */
export function efeitoCancelamentoAsoSobrePeriodico(
  status: PeriodicoFuturoStoredStatus | string
): "manter_aberto" | "reativar_cumprimento" {
  if (status === "reagendado") return "reativar_cumprimento";
  return "manter_aberto";
}

export function idsUnicosPeriodico(ids: Iterable<string>): string[] {
  return Array.from(
    new Set(Array.from(ids).map((id) => id.trim()).filter(Boolean))
  );
}

export function motivoExibicaoPeriodico(record: {
  status?: string | null;
  motivo_cancelamento?: string | null;
  motivo?: string | null;
  motivo_detalhe?: string | null;
  labelMotivoOrigem?: string;
}): string {
  const cancelamento = (record.motivo_cancelamento ?? "").trim();
  if (record.status === "cancelado" && cancelamento) return cancelamento;
  const origem = (record.labelMotivoOrigem ?? "").trim();
  if (origem && origem !== "—") return origem;
  const base = (record.motivo ?? "").trim();
  if (!base) return "—";
  return base;
}
