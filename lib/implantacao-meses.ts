/**
 * Abas mensais da listagem “Processos de implantação”.
 * Configuração centralizada (mês/ano) — fácil estender para 2027+.
 */

export type ImplantacaoYearMonth = {
  /** Ano civil (ex.: 2026). */
  year: number;
  /** Mês 1–12 (1 = janeiro). */
  month: number;
};

/** Início do intervalo de abas exibido na UI. */
export const IMPLANTACAO_MESES_ABAS_INICIO: ImplantacaoYearMonth = {
  year: 2026,
  month: 7,
};

/** Fim do intervalo de abas exibido na UI. */
export const IMPLANTACAO_MESES_ABAS_FIM: ImplantacaoYearMonth = {
  year: 2026,
  month: 12,
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

export function formatImplantacaoMesLabel(mes: ImplantacaoYearMonth): string {
  const label = MESES_PT_LABEL[mes.month - 1];
  return label ?? `Mês ${mes.month}`;
}

export function yearMonthKey(mes: ImplantacaoYearMonth): string {
  return `${mes.year}-${String(mes.month).padStart(2, "0")}`;
}

export function isSameYearMonth(
  a: ImplantacaoYearMonth,
  b: ImplantacaoYearMonth
): boolean {
  return a.year === b.year && a.month === b.month;
}

export function compareYearMonth(
  a: ImplantacaoYearMonth,
  b: ImplantacaoYearMonth
): number {
  return a.year - b.year || a.month - b.month;
}

/** Lista inclusiva de abas entre `from` e `to` (padrão: jul–dez/2026). */
export function listImplantacaoMesAbas(
  from: ImplantacaoYearMonth = IMPLANTACAO_MESES_ABAS_INICIO,
  to: ImplantacaoYearMonth = IMPLANTACAO_MESES_ABAS_FIM
): ImplantacaoYearMonth[] {
  if (compareYearMonth(from, to) > 0) return [];

  const result: ImplantacaoYearMonth[] = [];
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

export function getNowYearMonth(
  now: Date = new Date()
): ImplantacaoYearMonth {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };
}

/** Mês futuro (após o mês civil atual) fica desabilitado. Passados e atual liberados. */
export function isImplantacaoMesDisponivel(
  mes: ImplantacaoYearMonth,
  now: Date = new Date()
): boolean {
  return compareYearMonth(mes, getNowYearMonth(now)) <= 0;
}

/**
 * Aba inicial: mês atual se estiver no intervalo e disponível;
 * senão, o último mês disponível da lista; fallback no primeiro.
 */
export function resolveInitialImplantacaoMes(
  now: Date = new Date(),
  abas: ImplantacaoYearMonth[] = listImplantacaoMesAbas()
): ImplantacaoYearMonth {
  if (abas.length === 0) {
    return getNowYearMonth(now);
  }

  const current = getNowYearMonth(now);
  const currentInList = abas.find((a) => isSameYearMonth(a, current));
  if (currentInList && isImplantacaoMesDisponivel(currentInList, now)) {
    return currentInList;
  }

  const disponiveis = abas.filter((a) => isImplantacaoMesDisponivel(a, now));
  if (disponiveis.length > 0) {
    return disponiveis[disponiveis.length - 1];
  }

  return abas[0];
}

/**
 * Extrai ano/mês da data de aprovação (mesmo critério da coluna:
 * primeiros 10 chars ISO `YYYY-MM-DD`).
 */
export function yearMonthFromDataAprovacao(
  dataAprovacao: string | null | undefined
): ImplantacaoYearMonth | null {
  if (!dataAprovacao) return null;
  const day = dataAprovacao.slice(0, 10);
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

export function processoBelongsToMesAprovacao(
  dataAprovacao: string | null | undefined,
  mes: ImplantacaoYearMonth
): boolean {
  const ym = yearMonthFromDataAprovacao(dataAprovacao);
  if (!ym) return false;
  return isSameYearMonth(ym, mes);
}

export const IMPLANTACAO_MES_VAZIO_MSG =
  "Nenhum processo de implantação encontrado para este mês.";
