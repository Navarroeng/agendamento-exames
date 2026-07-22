import { formatDateBR } from "@/lib/format";

export const ESOCIAL_RECIBO_DUPLICADO_MSG =
  "Este número de recibo já está vinculado a outro agendamento.";

export const ESOCIAL_RECIBO_DUPLICADO_COMPLEMENTO =
  "Confira o número informado antes de continuar.";

export const ESOCIAL_RECIBO_VALIDATION_ERROR_MSG =
  "Não foi possível validar o número do recibo. Tente novamente.";

export const ESOCIAL_RECIBO_DUPLICADO_DB_CODE =
  "ESOCIAL_RECIBO_DUPLICADOS_EXISTENTES";

export interface EsocialReciboDuplicadoInfo {
  id: string;
  cliente_nome: string;
  colaborador: string;
  data_agendamento: string;
  aso: string;
  data_envio_esocial: string | null;
  esocial_recibo: string | null;
}

export class EsocialReciboDuplicadoError extends Error {
  readonly info: EsocialReciboDuplicadoInfo;
  readonly recibo: string;

  constructor(info: EsocialReciboDuplicadoInfo, recibo: string) {
    super(ESOCIAL_RECIBO_DUPLICADO_MSG);
    this.name = "EsocialReciboDuplicadoError";
    this.info = info;
    this.recibo = recibo;
  }
}

export function isEsocialReciboDuplicadoError(
  error: unknown
): error is EsocialReciboDuplicadoError {
  return error instanceof EsocialReciboDuplicadoError;
}

export function isPostgresEsocialReciboDuplicadoError(error: unknown): boolean {
  if (error === null || typeof error !== "object") return false;
  const code = (error as { code?: unknown }).code;
  const message = String((error as { message?: unknown }).message ?? "");
  return (
    code === "23505" &&
    (message.includes("esocial_recibo_normalizado") ||
      message.includes("idx_agendamentos_esocial_recibo"))
  );
}

export function formatEsocialReciboDuplicadoDetalhes(
  info: EsocialReciboDuplicadoInfo
): string[] {
  const lines = [
    `Empresa: ${info.cliente_nome}`,
    `Colaborador: ${info.colaborador}`,
    `Data do exame: ${formatDateBR(info.data_agendamento)}`,
    `Tipo de ASO: ${info.aso}`,
  ];

  if (info.data_envio_esocial) {
    lines.push(
      `Data de envio ao e-Social: ${formatDateBR(info.data_envio_esocial)}`
    );
  }

  return lines;
}
