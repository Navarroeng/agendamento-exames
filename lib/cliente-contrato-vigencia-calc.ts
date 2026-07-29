import { addMonthsToIsoDate } from "@/lib/cliente-contrato-dates";

/** Prazo padrão (meses) para contratos originados de orçamento. */
export const MESES_VIGENCIA_PADRAO_ORCAMENTO = 12;

/**
 * Calcula o fim da vigência a partir da data de início.
 * Usa meses de calendário (não 365 dias fixos).
 */
export function calcularFimVigencia(
  dataInicio: string,
  mesesVigencia: number = MESES_VIGENCIA_PADRAO_ORCAMENTO
): string {
  const iso = dataInicio.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`Data de início inválida: ${dataInicio}`);
  }
  const meses = Number.isFinite(mesesVigencia) && mesesVigencia > 0
    ? Math.floor(mesesVigencia)
    : MESES_VIGENCIA_PADRAO_ORCAMENTO;
  return addMonthsToIsoDate(iso, meses);
}

/** Extrai YYYY-MM-DD de date ou timestamptz. */
export function toIsoDateOnly(
  value: string | null | undefined
): string | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}
