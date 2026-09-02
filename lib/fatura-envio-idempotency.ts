/**
 * Chave de idempotência Resend para o primeiro envio de uma versão da fatura.
 * Nova emissão/reemissão → nova `data_emissao` → nova chave.
 */
export function buildFaturaEnvioIdempotencyKey(params: {
  faturaId: string;
  versaoIdentidade: string;
}): string {
  const faturaId = params.faturaId.trim();
  const versaoIdentidade = params.versaoIdentidade.trim();
  return `fatura-envio/${faturaId}/${versaoIdentidade}`;
}

/**
 * Chave de idempotência para reenvio explícito da mesma versão.
 * `reenvioIntentId` é emitido pelo servidor (token efêmero).
 */
export function buildFaturaReenvioIdempotencyKey(params: {
  faturaId: string;
  versaoIdentidade: string;
  reenvioIntentId: string;
}): string {
  const faturaId = params.faturaId.trim();
  const versaoIdentidade = params.versaoIdentidade.trim();
  const reenvioIntentId = params.reenvioIntentId.trim();
  return `fatura-reenvio/${faturaId}/${versaoIdentidade}/${reenvioIntentId}`;
}
