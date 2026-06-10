/** ISO date (YYYY-MM-DD) + N months, preserving day when possible. */
export function addMonthsToIsoDate(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1 + months, day);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function suggestDataFimAnual(dataInicio: string): string {
  return addMonthsToIsoDate(dataInicio, 12);
}
