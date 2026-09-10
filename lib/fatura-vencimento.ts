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

/** Normaliza dia de vencimento da clínica (1–31) ou null. */
export function parseDiaVencimentoFatura(
  value: string | number | null | undefined
): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 1 || n > 31) return null;
  return n;
}

export function formatDiaVencimentoFatura(
  dia: number | null | undefined
): string {
  const n = parseDiaVencimentoFatura(dia ?? null);
  if (n == null) return "—";
  return String(n).padStart(2, "0");
}

/**
 * Data de vencimento na competência (MM/AAAA) a partir do dia recorrente.
 * Dias 29/30/31 são limitados ao último dia válido do mês.
 */
export function calcDataVencimentoClinicaCompetencia(
  diaVencimento: number | null | undefined,
  mesReferencia: string
): { iso: string; label: string; diaEfetivo: number } | null {
  const dia = parseDiaVencimentoFatura(diaVencimento);
  if (dia == null || !isValidMonthYearBR(mesReferencia)) return null;

  const [monthStr, yearStr] = mesReferencia.trim().split("/");
  const month = Number(monthStr);
  const year = Number(yearStr);
  const ultimoDia = new Date(year, month, 0).getDate();
  const diaEfetivo = Math.min(dia, ultimoDia);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(diaEfetivo).padStart(2, "0")}`;

  return {
    iso,
    label: formatDateIsoToBR(iso),
    diaEfetivo,
  };
}

export type CustosClinicaVencimentoSituacao =
  | "sem_config"
  | "pago"
  | "vencido"
  | "vence_hoje"
  | "proximo"
  | "em_dia";

export type CustosClinicaVencimentoView = {
  situacao: CustosClinicaVencimentoSituacao;
  diaLabel: string;
  dataIso: string | null;
  dataLabel: string | null;
  /** Texto principal na coluna (ex.: "Dia 05" ou "—"). */
  titulo: string;
  /** Texto de alerta/status (ex.: "Vencido · 05/09/2026"). */
  detalhe: string | null;
  tone: "muted" | "danger" | "warning" | "neutral" | "ok";
};

function diasEntreIso(a: string, b: string): number {
  const da = new Date(`${a}T12:00:00`);
  const db = new Date(`${b}T12:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

/**
 * Visão de vencimento na listagem Custos Clínicas.
 * Alertas só quando ainda em aberto (não conferido/pago).
 */
export function buildCustosClinicaVencimentoView(params: {
  diaVencimento: number | null | undefined;
  mesReferencia: string;
  emAberto: boolean;
  hojeIso: string;
}): CustosClinicaVencimentoView {
  const dia = parseDiaVencimentoFatura(params.diaVencimento);
  if (dia == null) {
    return {
      situacao: "sem_config",
      diaLabel: "—",
      dataIso: null,
      dataLabel: null,
      titulo: "—",
      detalhe: null,
      tone: "muted",
    };
  }

  const calc = calcDataVencimentoClinicaCompetencia(dia, params.mesReferencia);
  if (!calc) {
    return {
      situacao: "sem_config",
      diaLabel: formatDiaVencimentoFatura(dia),
      dataIso: null,
      dataLabel: null,
      titulo: `Dia ${formatDiaVencimentoFatura(dia)}`,
      detalhe: null,
      tone: "muted",
    };
  }

  const diaLabel = formatDiaVencimentoFatura(dia);
  const titulo = `Dia ${diaLabel}`;

  if (!params.emAberto) {
    return {
      situacao: "pago",
      diaLabel,
      dataIso: calc.iso,
      dataLabel: calc.label,
      titulo,
      detalhe: `Vencimento ${calc.label}`,
      tone: "ok",
    };
  }

  const diff = diasEntreIso(params.hojeIso, calc.iso);
  if (diff < 0) {
    return {
      situacao: "vencido",
      diaLabel,
      dataIso: calc.iso,
      dataLabel: calc.label,
      titulo,
      detalhe: `Vencido · ${calc.label}`,
      tone: "danger",
    };
  }
  if (diff === 0) {
    return {
      situacao: "vence_hoje",
      diaLabel,
      dataIso: calc.iso,
      dataLabel: calc.label,
      titulo,
      detalhe: `Vence hoje · ${calc.label}`,
      tone: "warning",
    };
  }
  if (diff >= 1 && diff <= 5) {
    return {
      situacao: "proximo",
      diaLabel,
      dataIso: calc.iso,
      dataLabel: calc.label,
      titulo,
      detalhe: `Vence em ${diff} dia${diff === 1 ? "" : "s"} · ${calc.label}`,
      tone: "warning",
    };
  }

  return {
    situacao: "em_dia",
    diaLabel,
    dataIso: calc.iso,
    dataLabel: calc.label,
    titulo,
    detalhe: calc.label,
    tone: "neutral",
  };
}
