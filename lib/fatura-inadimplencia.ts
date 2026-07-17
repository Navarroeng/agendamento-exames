import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { mesReferenciaBRFromFatura } from "@/lib/fatura-reemissao";
import { formatCurrency } from "@/lib/money";
import type { FaturaRecord } from "@/lib/types";

export interface FaturaPendenciaInadimplencia {
  id: string;
  mesReferenciaBR: string;
  dataVencimentoBR: string;
  valorTotal: number;
  valorFormatado: string;
}

/** YYYY-MM a partir de data ISO (YYYY-MM-DD). */
export function mesAnoFromIsoDate(iso: string): string {
  return iso.split("T")[0].slice(0, 7);
}

export function mesAnoAtual(dataReferencia: Date = new Date()): string {
  const year = dataReferencia.getFullYear();
  const month = String(dataReferencia.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Regra Navarro: após o mês do vencimento, fatura emitida não paga vira Vencida.
 * Durante o mês do vencimento, permanece Emitida mesmo em atraso.
 */
export function faturaDeveMarcarComoVencida(
  fatura: Pick<FaturaRecord, "status" | "pago" | "data_vencimento" | "tipo">,
  dataReferencia: Date = new Date()
): boolean {
  if (fatura.tipo !== "cliente") return false;
  if (fatura.status !== "emitida") return false;
  if (fatura.pago) return false;

  const mesVencimento = mesAnoFromIsoDate(fatura.data_vencimento);
  const mesAtual = mesAnoAtual(dataReferencia);

  return mesAtual > mesVencimento;
}

export function faturaBloqueiaNovoAgendamento(
  fatura: Pick<FaturaRecord, "status" | "pago" | "tipo">
): boolean {
  return (
    fatura.tipo === "cliente" &&
    fatura.status === "vencida" &&
    !fatura.pago
  );
}

export function mapFaturaParaPendenciaInadimplencia(
  fatura: FaturaRecord
): FaturaPendenciaInadimplencia {
  const mesReferenciaBR =
    mesReferenciaBRFromFatura(fatura) ?? "—";

  return {
    id: fatura.id,
    mesReferenciaBR,
    dataVencimentoBR: formatDateIsoToBR(fatura.data_vencimento),
    valorTotal: Number(fatura.valor_total),
    valorFormatado: formatCurrency(Number(fatura.valor_total)),
  };
}

export function formatAuditoriaAgendamentoBloqueadoInadimplencia(
  mesReferenciaBR: string
): string {
  return `Novo agendamento bloqueado. Cliente possui fatura vencida referente ao período ${mesReferenciaBR}.`;
}
