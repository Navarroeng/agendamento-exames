import { parseMoney } from "@/lib/money";
import type { OrcamentoItemFormItem } from "@/lib/orcamento-types";

export function calcItemTotal(
  quantidade: string,
  valorUnitario: string
): number {
  const qtd = Number(String(quantidade).replace(",", ".")) || 0;
  const unit = parseMoney(valorUnitario);
  return Math.round(qtd * unit * 100) / 100;
}

export function calcSubtotalItens(itens: OrcamentoItemFormItem[]): number {
  return itens.reduce((acc, item) => {
    const total =
      item.valor_total.trim() !== ""
        ? parseMoney(item.valor_total)
        : calcItemTotal(item.quantidade, item.valor_unitario);
    return acc + total;
  }, 0);
}

export function calcValorTotalOrcamento(
  subtotal: number,
  descontoPercentual: string
): number {
  const desconto = Number(String(descontoPercentual).replace(",", ".")) || 0;
  const pct = Math.min(100, Math.max(0, desconto));
  const total = subtotal * (1 - pct / 100);
  return Math.round(total * 100) / 100;
}

export function formatQuantidadeDisplay(value: string): string {
  const normalized = value.replace(/[^\d,]/g, "");
  return normalized;
}
