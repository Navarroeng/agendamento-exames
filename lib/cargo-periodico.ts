import { addMonthsToIsoDate } from "@/lib/cliente-contrato-dates";
import type { ValidadePeriodicoMeses } from "@/lib/types";

export const VALIDADE_PERIODICO_PADRAO = 12;
export const VALIDADE_PERIODICO_ALERTA = 6;

export function cargoGeraAlertaPeriodico(
  validade: number | null | undefined
): boolean {
  return validade === VALIDADE_PERIODICO_ALERTA;
}

export function parseValidadePeriodicoMeses(
  value: string | number | null | undefined
): ValidadePeriodicoMeses {
  return Number(value) === VALIDADE_PERIODICO_ALERTA
    ? VALIDADE_PERIODICO_ALERTA
    : VALIDADE_PERIODICO_PADRAO;
}

export function computeProximaDataPeriodico(
  dataRealizadaIso: string,
  meses: ValidadePeriodicoMeses
): string {
  return addMonthsToIsoDate(dataRealizadaIso.split("T")[0], meses);
}

export function formatValidadePeriodicoLabel(
  meses: ValidadePeriodicoMeses
): string {
  if (meses === VALIDADE_PERIODICO_ALERTA) {
    return "6 meses / gerar alerta de periódico futuro";
  }
  return "12 meses / padrão";
}

export function formatValidadePeriodicoShort(
  meses: ValidadePeriodicoMeses
): string {
  if (meses === VALIDADE_PERIODICO_ALERTA) {
    return "Alerta 6 meses";
  }
  return "12 meses (padrão)";
}
