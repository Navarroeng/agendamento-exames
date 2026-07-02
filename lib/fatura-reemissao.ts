import type { FaturaRecord, FaturaStatus } from "@/lib/types";

/** Status históricos — sem fluxo financeiro ativo. */
export const FATURA_STATUS_INATIVOS: FaturaStatus[] = [
  "cancelada",
  "substituida",
  "reemitida",
];

export function faturaStatusEmissaoAtiva(status: FaturaStatus): boolean {
  return status === "emitida";
}

export function faturaStatusPermitePagamento(status: FaturaStatus): boolean {
  return status === "emitida";
}

export function faturaStatusContaNoResumoEmitido(status: FaturaStatus): boolean {
  return status === "emitida";
}

export function faturaStatusHistoricoInativo(status: FaturaStatus): boolean {
  return (
    status === "substituida" ||
    status === "reemitida" ||
    status === "cancelada"
  );
}

export function faturaStatusHistoricoReemissao(status: FaturaStatus): boolean {
  return status === "substituida" || status === "reemitida";
}

/** Converte mes_referencia (YYYY-MM) ou periodo_inicio em MM/AAAA. */
export function mesReferenciaBRFromFatura(
  fatura: Pick<FaturaRecord, "mes_referencia" | "periodo_inicio">
): string | null {
  const iso = fatura.mes_referencia?.trim() || fatura.periodo_inicio?.trim();
  if (!iso) return null;

  const base = iso.split("T")[0];
  const match = base.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;

  return `${match[2]}/${match[1]}`;
}

export function canReemitirFaturaCliente(fatura: FaturaRecord): boolean {
  if (fatura.tipo !== "cliente") return false;
  return (
    fatura.status === "necessita_reemissao" || fatura.status === "cancelada"
  );
}

export function faturaClienteBloqueiaFaturamento(
  fatura: Pick<FaturaRecord, "status" | "tipo">
): boolean {
  return (
    fatura.tipo === "cliente" &&
    (fatura.status === "emitida" || fatura.status === "necessita_reemissao")
  );
}
