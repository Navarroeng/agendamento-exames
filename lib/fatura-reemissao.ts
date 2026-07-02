import type { FaturaRecord } from "@/lib/types";

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

export function canReemitirFaturaCliente(
  fatura: FaturaRecord,
  options?: { alteracaoPosEmissao?: boolean }
): boolean {
  if (fatura.tipo !== "cliente") return false;
  if (fatura.status === "cancelada") return true;
  if (fatura.status === "emitida" && options?.alteracaoPosEmissao) {
    return true;
  }
  return false;
}
