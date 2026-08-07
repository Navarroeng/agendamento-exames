/**
 * Seleção de ano/mês para listagens (Implantação, Orçamentos, etc.).
 */

export type YearMonth = {
  /** Ano civil (ex.: 2026). */
  year: number;
  /** Mês 1–12 (1 = janeiro). */
  month: number;
};

const MESES_PT_LABEL: ReadonlyArray<string> = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function formatMesLabel(mes: YearMonth): string {
  const label = MESES_PT_LABEL[mes.month - 1];
  return label ?? `Mês ${mes.month}`;
}

export function yearMonthKey(mes: YearMonth): string {
  return `${mes.year}-${String(mes.month).padStart(2, "0")}`;
}

export function isSameYearMonth(a: YearMonth, b: YearMonth): boolean {
  return a.year === b.year && a.month === b.month;
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year - b.year || a.month - b.month;
}

/** Lista inclusiva de abas entre `from` e `to`. */
export function listMesAbas(
  from: YearMonth,
  to: YearMonth
): YearMonth[] {
  if (compareYearMonth(from, to) > 0) return [];

  const result: YearMonth[] = [];
  let year = from.year;
  let month = from.month;
  while (year < to.year || (year === to.year && month <= to.month)) {
    result.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

/** Meses de um ano: de `startMonth` (1–12) até dezembro. */
export function listMesAbasDoAno(
  year: number,
  startMonth = 1
): YearMonth[] {
  const fromMonth = Math.min(12, Math.max(1, startMonth));
  return listMesAbas({ year, month: fromMonth }, { year, month: 12 });
}

export function getNowYearMonth(now: Date = new Date()): YearMonth {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/** Mês futuro (após o mês civil atual) fica desabilitado. */
export function isMesDisponivel(
  mes: YearMonth,
  now: Date = new Date()
): boolean {
  return compareYearMonth(mes, getNowYearMonth(now)) <= 0;
}

/**
 * Aba inicial: mês atual se estiver no intervalo e disponível;
 * senão, o último mês disponível da lista; fallback no primeiro.
 */
export function resolveInitialMes(
  now: Date = new Date(),
  abas: YearMonth[]
): YearMonth {
  if (abas.length === 0) {
    return getNowYearMonth(now);
  }

  const current = getNowYearMonth(now);
  const currentInList = abas.find((a) => isSameYearMonth(a, current));
  if (currentInList && isMesDisponivel(currentInList, now)) {
    return currentInList;
  }

  const disponiveis = abas.filter((a) => isMesDisponivel(a, now));
  if (disponiveis.length > 0) {
    return disponiveis[disponiveis.length - 1];
  }

  return abas[0];
}

/**
 * Extrai ano/mês de data ISO (`YYYY-MM-DD` ou timestamp com T).
 * Usa os primeiros 10 caracteres (mesmo critério das colunas de data).
 */
export function yearMonthFromIsoDate(
  iso: string | null | undefined
): YearMonth | null {
  if (!iso) return null;
  const day = iso.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return { year, month };
}

export function belongsToYearMonth(
  iso: string | null | undefined,
  mes: YearMonth
): boolean {
  const ym = yearMonthFromIsoDate(iso);
  if (!ym) return false;
  return isSameYearMonth(ym, mes);
}

/** Anos disponíveis de `startYear` até o ano civil atual (inclusive). */
export function listAnosDisponiveis(
  startYear: number,
  now: Date = new Date()
): number[] {
  const end = now.getFullYear();
  if (end < startYear) return [startYear];
  const years: number[] = [];
  for (let y = startYear; y <= end; y += 1) years.push(y);
  return years;
}

/** Ano inicial padrão das listagens operacionais. */
export const LISTAGEM_ANO_INICIO = 2026;

export const LISTAGEM_MES_VAZIO_MSG =
  "Nenhum registro encontrado para este período.";

/**
 * Abas mensais de um ano.
 * Se `startMonthFirstYear` for informado e `year === startYear`,
 * o primeiro ano começa nesse mês (ex.: jul/2026).
 */
export function listMesAbasListagem(
  year: number,
  opts?: {
    startYear?: number;
    startMonthFirstYear?: number;
  }
): YearMonth[] {
  const startYear = opts?.startYear ?? LISTAGEM_ANO_INICIO;
  const startMonthFirstYear = opts?.startMonthFirstYear ?? 1;
  const startMonth =
    year === startYear ? startMonthFirstYear : 1;
  return listMesAbasDoAno(year, startMonth);
}

/**
 * Ao trocar o ano, mantém o mês se ainda for válido/disponível;
 * senão escolhe o melhor mês disponível daquele ano.
 */
export function resolveMesParaAno(
  year: number,
  preferredMonth: number,
  opts?: {
    startYear?: number;
    startMonthFirstYear?: number;
    now?: Date;
  }
): YearMonth {
  const now = opts?.now ?? new Date();
  const abas = listMesAbasListagem(year, opts);
  if (abas.length === 0) {
    return { year, month: preferredMonth };
  }

  const preferred = abas.find((a) => a.month === preferredMonth);
  if (preferred && isMesDisponivel(preferred, now)) {
    return preferred;
  }

  return resolveInitialMes(now, abas);
}

export function resolveInitialMesListagem(
  opts?: {
    startYear?: number;
    startMonthFirstYear?: number;
    now?: Date;
  }
): YearMonth {
  const now = opts?.now ?? new Date();
  const startYear = opts?.startYear ?? LISTAGEM_ANO_INICIO;
  const anos = listAnosDisponiveis(startYear, now);
  const year = now.getFullYear();
  const selectedYear = anos.includes(year)
    ? year
    : anos[anos.length - 1] ?? startYear;
  return resolveInitialMes(
    now,
    listMesAbasListagem(selectedYear, opts)
  );
}

/** Converte YearMonth → MM/AAAA (filtros legados de fatura/periódico). */
export function yearMonthToMesReferenciaBR(mes: YearMonth): string {
  return `${String(mes.month).padStart(2, "0")}/${mes.year}`;
}

/** Converte MM/AAAA → YearMonth. */
export function mesReferenciaBRToYearMonth(
  value: string | null | undefined
): YearMonth | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return { year, month };
}

/** Converte YYYY-MM (mes_referencia ISO) → YearMonth. */
export function mesReferenciaIsoToYearMonth(
  value: string | null | undefined
): YearMonth | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }
  return { year, month };
}
