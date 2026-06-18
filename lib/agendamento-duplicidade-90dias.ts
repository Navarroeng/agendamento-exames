import { normalizeCpfDigits } from "@/lib/cpf";
import type { AgendamentoStatus } from "@/lib/types";

export const AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG =
  "Este colaborador já possui um agendamento para esta empresa realizado ou agendado há menos de 90 dias.";

export const AGENDAMENTO_DUPLICIDADE_90_DIAS_COMPLEMENTO =
  "Não é permitido cadastrar um novo agendamento para o mesmo colaborador dentro deste período.";

export const AGENDAMENTO_DUPLICIDADE_90_DIAS_DB_CODE =
  "AGENDAMENTO_DUPLICIDADE_90_DIAS";

export const AGENDAMENTO_DUPLICIDADE_90_DIAS_LIMITE = 90;

export interface AgendamentoDuplicidade90DiasInfo {
  id: string;
  cliente_nome: string;
  colaborador: string;
  colaborador_cpf: string;
  data_agendamento: string;
  clinica_nome: string;
  tipo_aso: string;
  status: AgendamentoStatus;
  dias_entre: number;
}

export class AgendamentoDuplicidade90DiasError extends Error {
  readonly info: AgendamentoDuplicidade90DiasInfo;

  constructor(info: AgendamentoDuplicidade90DiasInfo) {
    super(AGENDAMENTO_DUPLICIDADE_90_DIAS_MSG);
    this.name = "AgendamentoDuplicidade90DiasError";
    this.info = info;
  }
}

export function isAgendamentoDuplicidade90DiasError(
  error: unknown
): error is AgendamentoDuplicidade90DiasError {
  return error instanceof AgendamentoDuplicidade90DiasError;
}

export function normalizeEmpresaNome(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function parseIsoDateOnly(value: string): Date {
  const base = value.split("T")[0];
  const [year, month, day] = base.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDaysIso(isoDate: string, days: number): string {
  const date = parseIsoDateOnly(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function diasEntreAgendamentos(
  isoA: string,
  isoB: string
): number {
  const a = parseIsoDateOnly(isoA).getTime();
  const b = parseIsoDateOnly(isoB).getTime();
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

export function violaDuplicidade90Dias(diasEntre: number): boolean {
  return diasEntre < AGENDAMENTO_DUPLICIDADE_90_DIAS_LIMITE;
}

export function evaluaConflitoDuplicidade90Dias(input: {
  cpfNovo: string;
  cpfExistente: string;
  empresaNova: string;
  empresaExistente: string;
  dataNova: string;
  dataExistente: string;
  statusExistente: string;
}): boolean {
  if (input.statusExistente === "cancelado") return false;

  const cpfNovo = normalizeCpfDigits(input.cpfNovo);
  const cpfExistente = normalizeCpfDigits(input.cpfExistente);
  if (cpfNovo.length !== 11 || cpfExistente.length !== 11) return false;
  if (cpfNovo !== cpfExistente) return false;

  if (
    normalizeEmpresaNome(input.empresaNova) !==
    normalizeEmpresaNome(input.empresaExistente)
  ) {
    return false;
  }

  return violaDuplicidade90Dias(
    diasEntreAgendamentos(input.dataNova, input.dataExistente)
  );
}

export function isPostgresDuplicidade90DiasError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    String((error as { message: unknown }).message).includes(
      AGENDAMENTO_DUPLICIDADE_90_DIAS_DB_CODE
    )
  );
}
