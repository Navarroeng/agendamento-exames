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

const LEMBRETE_REQUEST_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Um pedido de lembrete. Nova tentativa consciente usa outro requestId. */
export function buildFaturaLembreteIdempotencyKey(params: {
  faturaId: string;
  requestId: string;
}): string {
  const faturaId = params.faturaId.trim();
  const requestId = params.requestId.trim();
  if (!faturaId) throw new Error("Fatura inválida.");
  if (!LEMBRETE_REQUEST_ID.test(requestId)) {
    throw new Error("Identificador do envio inválido.");
  }
  return `fatura-lembrete/${faturaId}/${requestId}`;
}
