/** Opções de mês de referência (MM/AAAA) para seleção em lista. */

/** Primeiro mês disponível em todas as listas suspensas. */
export const MONTH_REFERENCE_MIN = "06/2026";

export function formatMonthYearBR(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${mm}/${date.getFullYear()}`;
}

function monthYearBRToDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12 || year < 1900 || year > 2100) return null;

  return new Date(year, month - 1, 1);
}

export function getCurrentMonthReferenceBR(): string {
  return formatMonthYearBR(new Date());
}

/** 12 meses anteriores, mês atual e 11 posteriores (24 opções), a partir de MONTH_REFERENCE_MIN. */
export function buildMonthReferenceOptions(
  referenceDate: Date = new Date(),
  monthsBefore = 12,
  monthsAfter = 11
): string[] {
  const calculatedStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - monthsBefore,
    1
  );
  const minStart = monthYearBRToDate(MONTH_REFERENCE_MIN) ?? calculatedStart;
  const start = calculatedStart < minStart ? minStart : calculatedStart;
  const total = monthsBefore + 1 + monthsAfter;
  const options: string[] = [];

  for (let i = 0; i < total; i++) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    options.push(formatMonthYearBR(date));
  }

  return options;
}

export function resolveMonthReferenceValue(
  value: string,
  options: string[] = buildMonthReferenceOptions()
): string {
  const trimmed = value.trim();
  if (trimmed && options.includes(trimmed)) return trimmed;
  return getCurrentMonthReferenceBR();
}
