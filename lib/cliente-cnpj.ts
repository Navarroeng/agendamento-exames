import { onlyDigits } from "@/lib/cnpj";

export const CLIENTE_CNPJ_DUPLICADO_MSG =
  "Já existe um cliente cadastrado com este CNPJ.";

export function normalizeCnpjDigits(value: string | null | undefined): string {
  return onlyDigits(value ?? "");
}

export function cnpjDigitsIguais(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const da = normalizeCnpjDigits(a);
  const db = normalizeCnpjDigits(b);
  if (!da || !db) return false;
  return da === db;
}

export function isSupabaseUniqueViolation(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === "23505"
  );
}

export function resolveClienteCnpjError(error: unknown): string | null {
  if (error instanceof Error && error.message === CLIENTE_CNPJ_DUPLICADO_MSG) {
    return CLIENTE_CNPJ_DUPLICADO_MSG;
  }

  if (isSupabaseUniqueViolation(error)) {
    return CLIENTE_CNPJ_DUPLICADO_MSG;
  }

  return null;
}
