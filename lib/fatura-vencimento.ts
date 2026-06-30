import {
  formatDateIsoToBR,
  isValidMonthYearBR,
} from "@/lib/agendamento-datetime";

function isDiaUtil(date: Date): boolean {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5;
}

function formatDateLocalToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 5º dia útil (segunda a sexta) de um mês calendário. */
export function calcQuintoDiaUtilDoMes(year: number, month: number): Date {
  let count = 0;

  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1) break;
    if (!isDiaUtil(date)) continue;
    count += 1;
    if (count === 5) return date;
  }

  throw new Error(
    `Não foi possível calcular o 5º dia útil de ${String(month).padStart(2, "0")}/${year}.`
  );
}

/** Vencimento padrão: 5º dia útil do mês seguinte ao MM/AAAA de referência. */
export function calcVencimentoFaturaCliente(mesReferencia: string): {
  iso: string;
  label: string;
} | null {
  if (!isValidMonthYearBR(mesReferencia)) return null;

  const [monthStr, yearStr] = mesReferencia.trim().split("/");
  let month = Number(monthStr);
  let year = Number(yearStr);

  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }

  const date = calcQuintoDiaUtilDoMes(year, month);
  const iso = formatDateLocalToIso(date);

  return {
    iso,
    label: formatDateIsoToBR(iso),
  };
}
