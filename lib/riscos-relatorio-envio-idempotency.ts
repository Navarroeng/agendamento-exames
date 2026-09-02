/**
 * Chave de idempotência Resend para o primeiro envio de uma versão do relatório.
 * Nova versão (regeneração) → novo `gerado_em` → nova chave.
 * Correção manual de registro (PATCH) não usa esta rota.
 */
export function buildRelatorioEnvioIdempotencyKey(params: {
  campanhaId: string;
  relatorioId: string;
  geradoEm: string;
}): string {
  const campanhaId = params.campanhaId.trim();
  const relatorioId = params.relatorioId.trim();
  const geradoEm = params.geradoEm.trim();
  return `riscos-relatorio-envio/${campanhaId}/${relatorioId}/${geradoEm}`;
}

/**
 * Chave de idempotência para reenvio explícito da mesma versão.
 * `reenvioIntentId` é emitido pelo servidor (token efêmero) — não aceito do client livremente.
 */
export function buildRelatorioReenvioIdempotencyKey(params: {
  campanhaId: string;
  relatorioId: string;
  geradoEm: string;
  reenvioIntentId: string;
}): string {
  const campanhaId = params.campanhaId.trim();
  const relatorioId = params.relatorioId.trim();
  const geradoEm = params.geradoEm.trim();
  const reenvioIntentId = params.reenvioIntentId.trim();
  return `riscos-relatorio-reenvio/${campanhaId}/${relatorioId}/${geradoEm}/${reenvioIntentId}`;
}
