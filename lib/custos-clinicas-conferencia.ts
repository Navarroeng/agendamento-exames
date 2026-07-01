import type { FaturaMesStatus } from "@/lib/fatura-mes-resumo";
import type { FaturaRecord, FaturaStatus } from "@/lib/types";

export const CUSTOS_CLINICA_STATUS_LABELS: Record<FaturaMesStatus, string> = {
  aberta_emissao: "Aberta para conferência",
  rascunho: "Aberta para conferência",
  emitida: "Conferido",
  paga: "Pago",
  cancelada: "Cancelada",
};

export function isCustosClinicaConferido(
  fatura: Pick<FaturaRecord, "tipo" | "status" | "pago">
): boolean {
  return (
    fatura.tipo === "clinica" &&
    fatura.status === "emitida" &&
    !fatura.pago
  );
}

export function isCustosClinicaAbertaConferencia(
  rowStatus: FaturaMesStatus
): boolean {
  return rowStatus === "aberta_emissao" || rowStatus === "rascunho";
}

export function faturaClinicaHistoricoStatusLabel(
  status: FaturaStatus,
  pago: boolean
): string {
  if (status === "cancelada") return "Cancelada";
  if (status === "rascunho") return "Aberta para conferência";
  if (status === "emitida") return pago ? "Pago" : "Conferido";
  return status;
}
