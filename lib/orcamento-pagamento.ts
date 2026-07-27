import { formatCurrency } from "@/lib/money";

export const DESCONTO_AVISTA_PERCENTUAL = 5;
export const PARCELA_MINIMA = 500;
export const MAX_PARCELAS = 10;

/** Arredonda para baixo na centena imediatamente inferior. */
export function arredondarCentenaParaBaixo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.floor(valor / 100) * 100;
}

export function calcValorComDescontoAvista(valorTotal: number): number {
  if (valorTotal <= 0) return 0;
  return valorTotal * (1 - DESCONTO_AVISTA_PERCENTUAL / 100);
}

/** Valor à vista exibido na proposta (5% de desconto + arredondamento). */
export function calcValorAVistaProposta(valorTotal: number): number {
  return arredondarCentenaParaBaixo(calcValorComDescontoAvista(valorTotal));
}

/**
 * Maior quantidade de parcelas (até 10) em que valorTotal / parcelas >= R$ 500.
 */
export function calcQuantidadeParcelas(valorTotal: number): number {
  if (valorTotal <= 0) return 1;
  for (let parcelas = MAX_PARCELAS; parcelas >= 1; parcelas--) {
    if (valorTotal / parcelas >= PARCELA_MINIMA) {
      return parcelas;
    }
  }
  return 1;
}

export function calcValorParcela(valorTotal: number, parcelas: number): number {
  if (parcelas <= 0) return valorTotal;
  return Math.round((valorTotal / parcelas) * 100) / 100;
}

export interface CondicoesPagamentoProposta {
  valorTotal: number;
  parcelas: number;
  valorParcela: number;
  valorAVista: number;
  textoParcelado: string;
  textoAVista: string;
}

/** Condições automáticas de pagamento para exibição (não alteram o valor salvo). */
export function calcCondicoesPagamentoProposta(
  valorTotal: number
): CondicoesPagamentoProposta {
  const total = Number(valorTotal);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const parcelas = calcQuantidadeParcelas(safeTotal);
  const valorParcela = calcValorParcela(safeTotal, parcelas);
  const valorAVista = calcValorAVistaProposta(safeTotal);

  return {
    valorTotal: safeTotal,
    parcelas,
    valorParcela,
    valorAVista,
    textoParcelado: `${parcelas}x de ${formatCurrency(valorParcela)}`,
    textoAVista: formatCurrency(valorAVista),
  };
}
