/**
 * Dia útil do calendário bancário brasileiro, usado na mensalidade e na fatura de exames.
 *
 * Resolução CMN nº 4.880/2020, art. 6º: não são dias úteis sábados, domingos,
 * feriados de âmbito nacional, a segunda-feira e a terça-feira de Carnaval
 * e o dia de Corpus Christi.
 *
 * Feriados nacionais fixos: Lei nº 662/1949, com a redação da Lei nº 10.607/2002
 * (1º de janeiro, 21 de abril, 1º de maio, 7 de setembro, 2 de novembro,
 * 15 de novembro e 25 de dezembro) e Lei nº 6.802/1980 (12 de outubro).
 * O dia 20 de novembro é feriado nacional pela Lei nº 14.759/2023, em vigor
 * desde a publicação em 22/12/2023; a primeira ocorrência é 20/11/2024.
 * A Sexta-feira da Paixão é o feriado religioso nomeado na Lei nº 9.093/1995, art. 2º,
 * e entra no calendário nacional sem expediente bancário publicado pela Febraban.
 *
 * A Quarta-feira de Cinzas e os dias 24 e 31 de dezembro têm horário especial
 * (arts. 2º e 3º da Resolução) e permanecem dias úteis. Ponto facultativo,
 * feriado estadual e feriado municipal não entram.
 * Carnaval, Sexta-feira da Paixão e Corpus Christi são calculados pela Páscoa
 * em qualquer ano. Não há tabela limitada a um ano.
 */

export const CALENDARIO_DIA_UTIL_ATUAL = "bancario_cmn_4880" as const;

export type CalendarioDiaUtil = typeof CALENDARIO_DIA_UTIL_ATUAL;

const FERIADOS_NACIONAIS_FIXOS: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [4, 21],
  [5, 1],
  [9, 7],
  [10, 12],
  [11, 2],
  [11, 15],
  [12, 25],
];

function formatDateLocalToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dataLocal(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function somarDias(date: Date, days: number): Date {
  return dataLocal(date.getFullYear(), date.getMonth() + 1, date.getDate() + days);
}

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Domingo de Páscoa no calendário gregoriano (algoritmo de Meeus). */
export function domingoDePascoa(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return dataLocal(year, month, day);
}

export function feriadosBancariosMoveis(year: number): Date[] {
  const pascoa = domingoDePascoa(year);
  return [
    somarDias(pascoa, -48),
    somarDias(pascoa, -47),
    somarDias(pascoa, -2),
    somarDias(pascoa, 60),
  ];
}

/** Feriado sem expediente bancário nacional. Não inclui feriado local nem ponto facultativo. */
export function isFeriadoBancarioNacional(date: Date): boolean {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  if (FERIADOS_NACIONAIS_FIXOS.some(([mes, dia]) => mes === month && dia === day)) {
    return true;
  }
  if (month === 11 && day === 20 && year >= 2024) return true;
  return feriadosBancariosMoveis(year).some((feriado) => mesmoDia(feriado, date));
}

/** Segunda a sexta, sem olhar feriado. */
export function isDiaUtilSemFeriado(date: Date): boolean {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5;
}

export function isDiaUtilBancario(date: Date): boolean {
  return isDiaUtilSemFeriado(date) && !isFeriadoBancarioNacional(date);
}

export function isDiaUtilOperacao(date: Date): boolean {
  return isDiaUtilBancario(date);
}

/** 5º dia útil bancário do mês. Não é o dia 05 fixo. */
export function calcQuintoDiaUtilDoMes(year: number, month: number): Date {
  let count = 0;

  for (let day = 1; day <= 31; day += 1) {
    const date = dataLocal(year, month, day);
    if (date.getMonth() !== month - 1) break;
    if (!isDiaUtilOperacao(date)) continue;
    count += 1;
    if (count === 5) return date;
  }

  throw new Error(
    `Não foi possível calcular o 5º dia útil de ${String(month).padStart(2, "0")}/${year}.`
  );
}

export function quintoDiaUtilIsoDoMes(year: number, month: number): string {
  return formatDateLocalToIso(calcQuintoDiaUtilDoMes(year, month));
}
