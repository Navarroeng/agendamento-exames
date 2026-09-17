import { formatCurrency } from "@/lib/money";
import {
  resolveItemValorForm,
  resolveItemValorServico,
} from "@/lib/orcamento-calculo";
import type {
  OrcamentoItemFormItem,
  OrcamentoItemRecord,
} from "@/lib/orcamento-types";
import { orcamentoPermitePagamentoAVista } from "@/lib/servico-aet";
import { isItemPacoteCompletoSst } from "@/lib/servico-sst-pacote";

export const DESCONTO_AVISTA_PERCENTUAL = 5;
export const PARCELA_MINIMA = 500;
export const MAX_PARCELAS = 10;

export const TEXTO_DESCONTO_AVISTA_PACOTE =
  "5% de desconto sobre o Pacote completo - SST, arredondado para baixo na centena. Serviços adicionais não recebem desconto.";

export type ItemBaseDescontoAvista = {
  servico_id?: string | null;
  servico_nome?: string | null;
  valor: number;
};

/** Arredonda para baixo na centena imediatamente inferior. */
export function arredondarCentenaParaBaixo(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.floor(valor / 100) * 100;
}

export function calcValorComDescontoAvista(valorTotal: number): number {
  if (valorTotal <= 0) return 0;
  return valorTotal * (1 - DESCONTO_AVISTA_PERCENTUAL / 100);
}

/** Valor à vista do Pacote completo - SST (5% de desconto + arredondamento). */
export function calcValorAVistaProposta(valorTotal: number): number {
  return arredondarCentenaParaBaixo(calcValorComDescontoAvista(valorTotal));
}

function valorItemPositivo(valor: number): number {
  const n = Number(valor);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Pacote completo - SST é a única base elegível ao desconto à vista. */
export function splitValoresDescontoAvista(
  itens: ItemBaseDescontoAvista[],
  pacoteServicoId?: string | null
): { elegivel: number; demais: number } {
  let elegivel = 0;
  let demais = 0;
  for (const item of itens) {
    const valor = valorItemPositivo(item.valor);
    if (valor <= 0) continue;
    if (isItemPacoteCompletoSst(item, pacoteServicoId)) {
      elegivel += valor;
    } else {
      demais += valor;
    }
  }
  return { elegivel, demais };
}

/**
 * À vista da proposta: desconto/arredondamento só no Pacote;
 * demais itens entram pelo valor integral.
 */
export function calcValorAVistaOrcamento(
  itens: ItemBaseDescontoAvista[],
  pacoteServicoId?: string | null
): number {
  if (!orcamentoPermitePagamentoAVista(itens)) return 0;
  const { elegivel, demais } = splitValoresDescontoAvista(
    itens,
    pacoteServicoId
  );
  return calcValorAVistaProposta(elegivel) + demais;
}

export function itensFormParaDescontoAvista(
  itens: OrcamentoItemFormItem[]
): ItemBaseDescontoAvista[] {
  return itens
    .filter((item) => item.servico_nome.trim() !== "")
    .map((item) => ({
      servico_id: item.servico_id,
      servico_nome: item.servico_nome,
      valor: resolveItemValorForm(item),
    }));
}

export function itensRegistroParaDescontoAvista(
  itens: Array<
    Pick<
      OrcamentoItemRecord,
      "servico_id" | "servico_nome" | "quantidade" | "valor_unitario" | "valor_total"
    >
  >
): ItemBaseDescontoAvista[] {
  return itens.map((item) => ({
    servico_id: item.servico_id,
    servico_nome: item.servico_nome,
    valor: resolveItemValorServico(item),
  }));
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

export function formatCondicaoPagamentoParcelas(
  parcelas: number,
  valorParcela: number
): string {
  const n = Math.max(1, Math.floor(Number(parcelas)) || 1);
  const unidade = n === 1 ? "parcela" : "parcelas";
  return `${n} ${unidade} de ${formatCurrency(valorParcela)}`;
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
  permitePagamentoAVista: boolean;
}

/** Condições de pagamento da proposta (parcelas manuais, limitadas pelo valor). */
export function calcCondicoesPagamentoProposta(
  valorTotal: number,
  quantidadeParcelas?: number | null,
  itensDescontoAvista?: ItemBaseDescontoAvista[] | null,
  pacoteServicoId?: string | null
): CondicoesPagamentoProposta {
  const total = Number(valorTotal);
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0;
  const maxParcelas = calcQuantidadeParcelas(safeTotal);
  const parcelas = resolveQuantidadeParcelasEscolhida(
    safeTotal,
    quantidadeParcelas
  );
  const valorParcela = calcValorParcela(safeTotal, parcelas);
  const permitePagamentoAVista = orcamentoPermitePagamentoAVista(
    itensDescontoAvista ?? []
  );
  const valorAVista = !permitePagamentoAVista
    ? 0
    : itensDescontoAvista == null
      ? calcValorAVistaProposta(safeTotal)
      : calcValorAVistaOrcamento(itensDescontoAvista, pacoteServicoId);

  return {
    valorTotal: safeTotal,
    parcelas,
    maxParcelas,
    opcoesParcelas: listOpcoesParcelas(safeTotal),
    valorParcela,
    valorAVista,
    textoParcelado: `${parcelas}x de ${formatCurrency(valorParcela)}`,
    textoAVista: permitePagamentoAVista ? formatCurrency(valorAVista) : "",
    permitePagamentoAVista,
  };
}
