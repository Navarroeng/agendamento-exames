/** Máscara e conversão de data/horário do agendamento (BR na tela, ISO no banco). */

export const INVALID_DATE_TOAST =
  "Data inválida. Use o formato DD/MM/AAAA.";
export const INVALID_TIME_TOAST =
  "Horário inválido. Use o formato HH:mm (24 horas).";

export function maskDateBR(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function maskMonthYearBR(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function isValidMonthYearBR(value: string): boolean {
  const match = value.trim().match(/^(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const month = Number(match[1]);
  const year = Number(match[2]);

  return month >= 1 && month <= 12 && year >= 1900 && year <= 2100;
}

/** MM/AAAA → primeiro e último dia do mês em ISO (YYYY-MM-DD). */
export function parseMonthYearBRToIsoRange(
  value: string
): { inicio: string; fim: string } | null {
  if (!isValidMonthYearBR(value)) return null;

  const [monthStr, yearStr] = value.trim().split("/");
  const month = Number(monthStr);
  const year = Number(yearStr);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = monthStr.padStart(2, "0");

  return {
    inicio: `${yearStr}-${mm}-01`,
    fim: `${yearStr}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function maskTime24(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function isValidDateBR(value: string): boolean {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function isValidHorario24(value: string): boolean {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export function parseDateBRToIso(value: string): string | null {
  if (!isValidDateBR(value)) return null;
  const [day, month, year] = value.trim().split("/");
  return `${year}-${month}-${day}`;
}

export function formatDateIsoToBR(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const base = iso.split("T")[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return iso;
  const [year, month, day] = base.split("-");
  return `${day}/${month}/${year}`;
}

export function formatHorarioForForm(
  horario: string | null | undefined
): string {
  if (!horario?.trim()) return "";
  const parts = horario.trim().split(":");
  if (parts.length < 2) return horario.trim();
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
}

export function parseHorarioToStorage(value: string): string | null {
  if (!isValidHorario24(value)) return null;
  return value.trim();
}

/** DD/MM/AAAA ou ISO → DD/MM para mensagem WhatsApp */
export function formatDataDDM(displayOrIso: string): string {
  if (!displayOrIso?.trim()) return "";

  if (displayOrIso.includes("/")) {
    const [day, month] = displayOrIso.trim().split("/");
    if (day && month) return `${day}/${month}`;
    return "";
  }

  const [year, month, day] = displayOrIso.split("T")[0].split("-");
  if (day && month) return `${day}/${month}`;
  return "";
}
