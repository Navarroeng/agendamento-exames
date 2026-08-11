/**
 * Regra global: um CPF só pode estar em uma campanha ATIVA
 * (em_preparacao | aberta), independentemente de empresa/origem.
 */

import { RISCOS_CAMPANHA_STATUS_LABELS, type RiscosCampanhaStatus } from "@/lib/riscos-campanha";
import { RISCOS_CAMPANHA_STATUS_ATIVOS } from "@/lib/riscos-campanha-origem";
import { participanteEstaRemovido } from "@/lib/riscos-remocao-participante";

export type CpfCampanhaAtivaConflict = {
  participanteId: string;
  campanhaId: string;
  empresaNome: string;
  codigoPublico: string;
  status: RiscosCampanhaStatus | string;
};

export function isCampanhaStatusAtivoParaCpf(
  status: string | null | undefined
): boolean {
  return (RISCOS_CAMPANHA_STATUS_ATIVOS as readonly string[]).includes(
    String(status ?? "")
  );
}

/** Participante “ocupa” o CPF se não estiver removido/invalidado. */
export function participanteOcupaCpfNaCampanha(input: {
  status: string;
  removido_em?: string | null;
}): boolean {
  return !participanteEstaRemovido(input);
}

export function formatMensagemCpfEmCampanhaAtiva(
  conflict: CpfCampanhaAtivaConflict
): string {
  const statusLabel =
    RISCOS_CAMPANHA_STATUS_LABELS[
      conflict.status as keyof typeof RISCOS_CAMPANHA_STATUS_LABELS
    ] ?? String(conflict.status);

  return [
    "Este CPF já está participando de outra campanha ativa de Riscos Psicossociais.",
    "",
    `Empresa: ${conflict.empresaNome}`,
    `Código da campanha: ${conflict.codigoPublico}`,
    `Status: ${statusLabel}`,
    "",
    "Finalize ou cancele a campanha existente antes de cadastrá-lo novamente.",
  ].join("\n");
}

export function formatMotivoIgnoradoImportacao(
  conflict: CpfCampanhaAtivaConflict
): string {
  return `CPF já pertence à campanha ${conflict.codigoPublico} da empresa ${conflict.empresaNome}.`;
}

export class CpfCampanhaAtivaError extends Error {
  readonly conflict: CpfCampanhaAtivaConflict;
  readonly httpStatus = 409 as const;

  constructor(conflict: CpfCampanhaAtivaConflict) {
    super(formatMensagemCpfEmCampanhaAtiva(conflict));
    this.name = "CpfCampanhaAtivaError";
    this.conflict = conflict;
  }
}
