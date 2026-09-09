/** Máscara e validação de CPF (tela). */

import { onlyDigits } from "@/lib/cnpj";

export function normalizeCpfDigits(value: string | null | undefined): string {
  return onlyDigits(value ?? "");
}

export function maskCPFInput(value: string): string {
  const digits = normalizeCpfDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCPF(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  return maskCPFInput(value);
}

function formatIntegerSemNotacaoCientifica(n: number): string {
  const truncated = Math.trunc(Math.abs(n));
  return truncated.toLocaleString("en-US", {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
}

/**
 * Normaliza CPF vindo de célula Excel/CSV.
 * Trata number, string mascarada, ".0", notação científica e perda de
 * um zero à esquerda quando a recuperação for inequívoca (CPF válido).
 */
export function normalizarCpfDeCelulaExcel(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "boolean") return "";

  let candidate = "";

  if (typeof value === "number" && Number.isFinite(value)) {
    candidate = formatIntegerSemNotacaoCientifica(value);
  } else {
    let text = String(value).trim();
    if (!text) return "";

    const sciProbe = text.replace(/\s/g, "").replace(",", ".");
    if (/^[+-]?\d+(?:\.\d+)?[eE][+-]?\d+$/.test(sciProbe)) {
      const n = Number(sciProbe);
      if (Number.isFinite(n)) {
        candidate = formatIntegerSemNotacaoCientifica(n);
      } else {
        candidate = text;
      }
    } else {
      // Excel às vezes formata inteiro como "52998224725.0" / "52998224725,0"
      text = text.replace(/[.,]0+$/, "");
      candidate = text;
    }
  }

  const digits = onlyDigits(candidate);

  // Excel removeu 1 zero à esquerda → 10 dígitos. Só completa se o CPF padded for válido.
  if (digits.length === 10) {
    const padded = `0${digits}`;
    if (isValidCPF(padded)) return padded;
  }

  return digits;
}

export function isValidCPF(value: string | null | undefined): boolean {
  const digits = normalizeCpfDigits(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += Number(digits[i]) * (10 - i);
  }
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += Number(digits[i]) * (11 - i);
  }
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === Number(digits[10]);
}
