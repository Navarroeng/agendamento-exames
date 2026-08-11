/**
 * Regras de remoção lógica / elegibilidade de participação COPSOQ.
 */

export const MOTIVO_REMOCAO_PADRAO =
  "Remoção administrativa do participante da campanha.";

export const MOTIVO_REMOCAO_APOS_CONCLUSAO =
  "Remoção administrativa após conclusão: participação excluída dos resultados e do acesso.";

/** Status que não são aptos e não devem aparecer na lista ativa. */
export const PARTICIPANTE_STATUS_INATIVOS = [
  "removido",
  "invalidado",
] as const;

export function participanteEstaRemovido(input: {
  status: string;
  removido_em?: string | null;
}): boolean {
  if (input.removido_em) return true;
  return (PARTICIPANTE_STATUS_INATIVOS as readonly string[]).includes(
    input.status
  );
}

/** Pode usar remoção comum (confirmação simples). */
export function precisaConfirmacaoForteRemocao(status: string): boolean {
  return status === "respondido" || status === "invalidado";
}
