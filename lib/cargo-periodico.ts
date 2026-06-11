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
  return meses === VALIDADE_PERIODICO_ALERTA ? "6 meses" : "12 meses";
}

export function formatValidadePeriodicoShort(
  meses: ValidadePeriodicoMeses
): string {
  return meses === VALIDADE_PERIODICO_ALERTA ? "6 meses" : "12 meses";
}

export function formatValidadePeriodicoBadge(meses: ValidadePeriodicoMeses): {
  label: string;
  className: string;
} {
  if (meses === VALIDADE_PERIODICO_ALERTA) {
    return {
      label: "6 MESES",
      className:
        "bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]/80 uppercase tracking-wide",
    };
  }

  return {
    label: "12 MESES",
    className:
      "bg-brand-blue-soft text-brand-blue border border-brand-blue/20 uppercase tracking-wide",
  };
}

export function isValidadePeriodicoSelecionada(
  value: string
): value is `${ValidadePeriodicoMeses}` {
  return value === "6" || value === "12";
}
