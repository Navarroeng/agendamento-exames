const RECIBO_DIGITS = 21;
const RECIBO_MASKED_LENGTH = 23;

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Aplica máscara N.N.NNNNNNNNNNNNNNNNNNN (21 dígitos, 2 pontos). */
export function maskEsocialRecibo(raw: string): string {
  const digits = onlyDigits(raw).slice(0, RECIBO_DIGITS);
  if (digits.length === 0) return "";
  if (digits.length === 1) return digits[0];
  if (digits.length === 2) return `${digits[0]}.${digits[1]}`;
  return `${digits[0]}.${digits[1]}.${digits.slice(2)}`;
}

export function isValidEsocialRecibo(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== RECIBO_DIGITS) return false;
  return /^\d\.\d\.\d{19}$/.test(maskEsocialRecibo(digits));
}

/** Normaliza para exibição (aceita valor já formatado ou só dígitos). */
export function formatEsocialReciboForDisplay(
  value: string | null | undefined
): string {
  if (!value?.trim()) return "";
  const digits = onlyDigits(value);
  if (digits.length === 0) return "";
  return maskEsocialRecibo(digits);
}

export { RECIBO_DIGITS, RECIBO_MASKED_LENGTH };
