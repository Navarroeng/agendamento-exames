/** Datas em formato brasileiro (exibição) e ISO (banco). */

/** Hoje como data civil local (YYYY-MM-DD), sem conversão UTC. */
export function hojeCivilIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Normaliza data de nascimento para YYYY-MM-DD (data civil).
 * Aceita:
 * - DD/MM/AAAA
 * - DDMMAAAA
 * - YYYY-MM-DD (já normalizado pelo portal/banco)
 *
 * Não aplica timezone: valida o calendário civil via UTC components
 * apenas como âncora de dia/mês/ano, sem deslocar o fuso.
 */
export function parseDataNascimentoBr(
  value: string | null | undefined
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  let day: number;
  let month: number;
  let year: number;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const masked = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (masked) {
    day = Number(masked[1]);
    month = Number(masked[2]);
    year = Number(masked[3]);
  } else {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 8) return null;
    day = Number(digits.slice(0, 2));
    month = Number(digits.slice(2, 4));
    year = Number(digits.slice(4, 8));
  }

  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) {
    return null;
  }
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  // Âncora civil (UTC) — só para validar existência do dia no calendário.
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  const civil = `${year}-${mm}-${dd}`;

  // Não aceitar data futura (comparação civil local).
  if (civil > hojeCivilIso()) return null;

  return civil;
}

/** Máscara de digitação DD/MM/AAAA. */
export function maskDataNascimentoInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** YYYY-MM-DD → DD/MM/AAAA */
export function formatDataNascimentoBr(
  iso: string | null | undefined
): string {
  const v = String(iso ?? "").slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Compara duas datas (ISO ou Date) só pelo dia civil. */
export function datasNascimentoIguais(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na =
    parseDataNascimentoBr(a) ??
    parseDataNascimentoBr(String(a ?? "").slice(0, 10));
  const nb =
    parseDataNascimentoBr(b) ??
    parseDataNascimentoBr(String(b ?? "").slice(0, 10));
  if (!na || !nb) return false;
  return na === nb;
}
