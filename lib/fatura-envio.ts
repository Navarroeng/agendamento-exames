import type { FaturaRecord, FaturaStatus } from "@/lib/types";

/** Status financeiros que permitem envio do documento atual por e-mail. */
export function faturaStatusPermiteEnvioEmail(status: FaturaStatus): boolean {
  return status === "emitida" || status === "vencida";
}

export function isFaturaEnvioExplicitamenteConfirmado(
  fatura: Pick<FaturaRecord, "fatura_enviada_em">
): boolean {
  return Boolean(fatura.fatura_enviada_em?.trim());
}

/**
 * Identidade estável da versão documental para idempotência Resend.
 * `data_emissao` muda somente na emissão/reemissão — não em pagamento ou leitura.
 */
export function buildFaturaEnvioVersaoIdentidade(
  fatura: Pick<FaturaRecord, "data_emissao" | "id">
): string {
  const emissao = fatura.data_emissao?.trim();
  if (!emissao) {
    throw new Error(
      "Fatura sem data de emissão. Emita a fatura antes de enviar por e-mail."
    );
  }
  return emissao;
}
