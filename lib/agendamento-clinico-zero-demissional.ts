import { isExameClinicoManual } from "@/lib/exame-pricing";
import { parseMoney } from "@/lib/money";
import type { ExameFormItem } from "@/lib/types";
import type { ExamePayload } from "@/services/agendamento.service";

export const MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST =
  "Informe o motivo para o exame Clínico estar com valor R$ 0,00 no ASO Demissional.";

export const MOTIVO_CLINICO_ZERO_PLACEHOLDER =
  "Informe o motivo de não cobrar o exame clínico neste ASO demissional…";

export const VALOR_CLIENTE_ZERO_BLOQUEADO_MSG =
  "O valor cliente deve ser maior que R$ 0,00 para este exame.";

export function isAsoDemissional(aso: string): boolean {
  return aso.trim() === "Demissional";
}

export function isClinicoDemissionalValorZero(
  aso: string,
  tipoExame: string,
  valorCliente: number
): boolean {
  return (
    isAsoDemissional(aso) &&
    isExameClinicoManual(tipoExame) &&
    valorCliente === 0
  );
}

export function exigeMotivoClinicoZeroDemissional(
  aso: string,
  exam: Pick<ExameFormItem, "tipo_exame" | "valor_cliente">
): boolean {
  if (!isFilled(exam.valor_cliente)) return false;
  const valor = parseMoney(exam.valor_cliente);
  return isClinicoDemissionalValorZero(aso, exam.tipo_exame, valor);
}

export function exibeCampoMotivoClinicoZeroDemissional(
  aso: string,
  exam: Pick<ExameFormItem, "tipo_exame" | "valor_cliente">
): boolean {
  return exigeMotivoClinicoZeroDemissional(aso, exam);
}

function isFilled(value: string | null | undefined): boolean {
  return (value ?? "").trim() !== "";
}

export function resolveMotivoValorZeroPayload(
  aso: string,
  exam: Pick<ExameFormItem, "tipo_exame" | "valor_cliente" | "motivo_valor_zero">
): string | null {
  const motivo = exam.motivo_valor_zero?.trim() || null;
  if (!motivo) return null;

  if (exigeMotivoClinicoZeroDemissional(aso, exam)) {
    return motivo;
  }

  if (
    isAsoDemissional(aso) &&
    isExameClinicoManual(exam.tipo_exame) &&
    parseMoney(exam.valor_cliente) > 0
  ) {
    return motivo;
  }

  return null;
}

export function assertExamesValorClientePermitido(
  aso: string,
  exames: ExamePayload[]
): void {
  for (const exame of exames) {
    const valor = Number(exame.valor_cliente);
    if (valor > 0) continue;

    if (valor < 0) {
      throw new Error(VALOR_CLIENTE_ZERO_BLOQUEADO_MSG);
    }

    if (isExameClinicoManual(exame.tipo_exame)) {
      if (aso.trim() === "Periódico") continue;

      if (isClinicoDemissionalValorZero(aso, exame.tipo_exame, valor)) {
        if (!exame.motivo_valor_zero?.trim()) {
          throw new Error(MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST);
        }
        continue;
      }
    }

    throw new Error(VALOR_CLIENTE_ZERO_BLOQUEADO_MSG);
  }
}
