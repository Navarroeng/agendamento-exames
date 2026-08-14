import { formatCurrencyIntl } from "@/lib/money";

export type RelatoriosChartValueFormat = "currency" | "number";

/** Formata valor do gráfico só para exibição (não altera o dado de origem). */
export function formatRelatoriosChartTick(
  value: unknown,
  valueFormat: RelatoriosChartValueFormat
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (valueFormat === "currency") return formatCurrencyIntl(n);
  return String(n);
}
