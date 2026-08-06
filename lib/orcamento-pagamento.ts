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

/** Opções válidas de parcelamento para o valor total (1 .. máximo permitido). */
export function listOpcoesParcelas(valorTotal: number): number[] {
  const max = calcQuantidadeParcelas(valorTotal);
  return Array.from({ length: max }, (_, index) => index + 1);
}

/**
 * Resolve a quantidade efetiva: usa a escolhida se válida; senão limita ao máximo.
 * Sem escolha (null/undefined/NaN), mantém o máximo permitido (legado).
 */
export function resolveQuantidadeParcelasEscolhida(
  valorTotal: number,
  quantidadeEscolhida?: number | null
): number {
  const max = calcQuantidadeParcelas(valorTotal);
  if (
    quantidadeEscolhida == null ||
    !Number.isFinite(Number(quantidadeEscolhida))
  ) {
    return max;
  }
  const n = Math.floor(Number(quantidadeEscolhida));
  if (n < 1) return 1;
  return Math.min(n, max);
}

export function calcValorParcela(valorTotal: number, parcelas: number): number {
  if (parcelas <= 0) return valorTotal;
  return Math.round((valorTotal / parcelas) * 100) / 100;
}

export interface CondicoesPagamentoProposta {
  valorTotal: number;
  parcelas: number;
  maxParcelas: number;
  opcoesParcelas: number[];
  valorParcela: number;
  valorAVista: number;
  textoParcelado: string;
  textoAVista: string;
}

/** Condições de pagamento da proposta (parcelas manuais, limitadas pelo valor). */
export function calcCondicoesPagamentoProposta(
  valorTotal: number,
  quantidadeParcelas?: number | null
): CondicoesPagamentoProposta {
  const total = Number(valorTotal);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const maxParcelas = calcQuantidadeParcelas(safeTotal);
  const parcelas = resolveQuantidadeParcelasEscolhida(
    safeTotal,
    quantidadeParcelas
  );
  const valorParcela = calcValorParcela(safeTotal, parcelas);
  const valorAVista = calcValorAVistaProposta(safeTotal);

  return {
    valorTotal: safeTotal,
    parcelas,
    maxParcelas,
    opcoesParcelas: listOpcoesParcelas(safeTotal),
    valorParcela,
    valorAVista,
    textoParcelado: `${parcelas}x de ${formatCurrency(valorParcela)}`,
    textoAVista: formatCurrency(valorAVista),
  };
}
