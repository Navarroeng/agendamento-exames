/** Opções de mês de referência (MM/AAAA) para seleção em lista. */

export function formatMonthYearBR(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${mm}/${date.getFullYear()}`;
}

export function getCurrentMonthReferenceBR(): string {
  return formatMonthYearBR(new Date());
}

/** 12 meses anteriores, mês atual e 11 posteriores (24 opções). */
export function buildMonthReferenceOptions(
  referenceDate: Date = new Date(),
  monthsBefore = 12,
  monthsAfter = 11
): string[] {
  const start = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() - monthsBefore,
    1
  );
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
