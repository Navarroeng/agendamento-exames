import {
  parseMonthYearBRToIsoRange,
  todayIsoSaoPaulo,
} from "@/lib/agendamento-datetime";

export type DashboardNow = Date | string;

export interface DashboardMonthBounds {
  /** Primeiro dia do mês civil atual (YYYY-MM-DD). */
  inicioMesAtual: string;
  /** Último dia do mês civil atual (YYYY-MM-DD). */
  fimMesAtual: string;
  /** Data de hoje em America/Sao_Paulo (YYYY-MM-DD). */
  hojeIso: string;
}

function resolveHojeIso(now: DashboardNow): string {
  if (typeof now === "string") {
    const iso = now.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      throw new Error(`Data de referência inválida: ${now}`);
    }
    return iso;
  }
  return todayIsoSaoPaulo(now);
}

/** Soma/subtrai dias em data civil (YYYY-MM-DD), sem passar por UTC. */
export function addCalendarDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("T")[0].split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Limites do mês civil atual em calendário (America/Sao_Paulo).
 * Aceita `Date` (produção) ou `YYYY-MM-DD` (testes, sem fuso).
 */
export function getDashboardMonthBounds(
  now: DashboardNow = new Date()
): DashboardMonthBounds {
  const hojeIso = resolveHojeIso(now);
  const [yearStr, monthStr] = hojeIso.split("-");
  const range = parseMonthYearBRToIsoRange(`${monthStr}/${yearStr}`);
  if (!range) {
    throw new Error(`Não foi possível calcular o mês atual a partir de ${hojeIso}.`);
  }
  return {
    inicioMesAtual: range.inicio,
    fimMesAtual: range.fim,
    hojeIso,
  };
}

export function toIsoDate(value: string | null | undefined): string {
  return String(value ?? "").split("T")[0];
}

/** Competência anterior ao mês atual: `data < inicioMesAtual`. */
export function isCompetenciaMesesAnteriores(
  isoDate: string | null | undefined,
  inicioMesAtual: string
): boolean {
  const data = toIsoDate(isoDate);
  return Boolean(data) && data < inicioMesAtual;
}

/** Competência do mês atual: `inicioMesAtual <= data <= fimMesAtual`. */
export function isCompetenciaMesAtual(
  isoDate: string | null | undefined,
  inicioMesAtual: string,
  fimMesAtual: string
): boolean {
  const data = toIsoDate(isoDate);
  return Boolean(data) && data >= inicioMesAtual && data <= fimMesAtual;
}
