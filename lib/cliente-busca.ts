import { textsMatchSearch } from "@/lib/text-normalize";
import type { ClienteRecord } from "@/lib/types";

export function escapeIlikeTerm(value: string): string {
  return value.replace(/[\\%_,]/g, (char) => `\\${char}`);
}

export function clienteRecordMatchesBusca(
  record: Pick<ClienteRecord, "nome" | "cnpj"> & {
    email?: string | null;
    telefone?: string | null;
    contato?: string | null;
  },
  busca: string
): boolean {
  const trimmed = busca.trim();
  if (!trimmed) return true;

  if (
    textsMatchSearch(
      [record.nome, record.cnpj, record.email, record.telefone, record.contato],
      trimmed
    )
  ) {
    return true;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 2) {
    const cnpjDigits = record.cnpj.replace(/\D/g, "");
    return cnpjDigits.includes(digits);
  }

  return false;
}

/** Corresponde dígitos consecutivos em CNPJ com máscara (ex.: 33.476.248/0001-82). */
export function buildCnpjDigitSequencePattern(digits: string): string {
  if (!digits) return "";
  const parts = digits.split("").map((digit) => escapeIlikeTerm(digit));
  return `%${parts.join("%")}%`;
}

export interface BuildClienteBuscaFiltersOptions {
  /** Quando false, usa padrão com curingas no campo cnpj mascarado (sem cnpj_digits). */
  useCnpjDigitsColumn?: boolean;
}

export function buildClienteBuscaOrFilters(
  busca: string,
  options: BuildClienteBuscaFiltersOptions = {}
): string[] {
  const useCnpjDigitsColumn = options.useCnpjDigitsColumn ?? true;
  const trimmed = busca.trim();
  if (!trimmed) return [];

  const escaped = escapeIlikeTerm(trimmed);
  const pattern = `%${escaped}%`;
  const digits = trimmed.replace(/\D/g, "");

  const filters = [
    `nome.ilike.${pattern}`,
    `email.ilike.${pattern}`,
    `telefone.ilike.${pattern}`,
    `contato.ilike.${pattern}`,
    `cnpj.ilike.${pattern}`,
  ];

  if (digits.length >= 2) {
    if (useCnpjDigitsColumn) {
      filters.push(`cnpj_digits.ilike.%${escapeIlikeTerm(digits)}%`);
    } else {
      filters.push(`cnpj.ilike.${buildCnpjDigitSequencePattern(digits)}`);
    }
  }

  return filters;
}

export function isCnpjDigitsColumnMissing(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message =
    "message" in error ? String((error as { message: unknown }).message) : "";
  const code =
    "code" in error ? String((error as { code: unknown }).code) : "";

  return (
    message.includes("cnpj_digits") &&
    (message.includes("does not exist") ||
      message.includes("Could not find") ||
      message.includes("schema cache") ||
      code === "42703" ||
      code === "PGRST204")
  );
}
