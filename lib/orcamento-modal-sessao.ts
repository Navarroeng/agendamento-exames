/** Identifica a abertura do modal. Salvar a mesma contratação não gera outra sessão. */
export function chaveSessaoModalOrcamento(params: {
  orcamentoId: string;
  mode: string;
  initialTab?: string | null;
}): string {
  return [params.orcamentoId, params.mode, params.initialTab ?? ""].join("\0");
}
