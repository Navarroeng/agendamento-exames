export function parseMoney(value: string): number {
  if (!value) return 0;
  return (
    Number(
      String(value)
        .replace(/R\$/g, "")
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^0-9.-]/g, "")
    ) || 0
  );
}

export function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatCurrency(value: number): string {
  return `R$ ${formatMoney(value)}`;
}

const BRL_CURRENCY = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Exibição monetária pt-BR via Intl (inclui negativos no padrão da locale). */
export function formatCurrencyIntl(value: number): string {
  return BRL_CURRENCY.format(value);
}

/** Alias explícito para exibição em pt-BR (R$ 2.000,00). */
export const formatCurrencyBRL = formatCurrency;

/** Máscara de entrada monetária: dígitos digitados viram centavos (ex.: 200000 → R$ 2.000,00). */
export function maskMoneyInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return formatCurrency(Number(digits) / 100);
}

export function emptyToNull(value: string): string | null {
  return value && value.trim() !== "" ? value : null;
}

export function isSim(value: string): boolean {
  return value === "Sim";
}
