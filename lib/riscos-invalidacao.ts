/**
 * Regras de invalidação administrativa de participação COPSOQ.
 * Não apaga sessão/respostas; apenas marca fora da consolidação.
 */

export const MOTIVO_INVALIDACAO_PADRAO =
  "Invalidação administrativa: participação concluída excluída dos resultados consolidados.";

export const MOTIVO_INVALIDACAO_ORFA =
  "Sessão órfã: participante removido antes da regra de invalidação administrativa.";

export type SessaoValidadeFields = {
  valida?: boolean | null;
  invalidada_em?: string | null;
  invalidada_por?: string | null;
  motivo_invalidacao?: string | null;
};

/** Sessão conta em resultados se concluída e válida (default true se campo ausente). */
export function sessaoContaNosResultados(s: {
  status: string;
  valida?: boolean | null;
}): boolean {
  if (s.status !== "concluida") return false;
  return s.valida !== false;
}

export function podeRemoverParticipanteComum(status: string): boolean {
  return status === "pendente";
}

export function podeInvalidarParticipacao(status: string): boolean {
  return status === "respondido";
}
