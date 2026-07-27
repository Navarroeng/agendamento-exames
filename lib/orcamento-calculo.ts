import { parseMoney } from "@/lib/money";
import type {
  OrcamentoComItens,
  OrcamentoItemFormItem,
  OrcamentoItemRecord,
} from "@/lib/orcamento-types";
import {
  isPacoteCompletoSst,
  PACOTE_COMPLETO_SST_NOME,
} from "@/lib/servico-sst-pacote";

const LEGACY_VALOR_TOLERANCE = 0.01;

export function formatQuantidadeColaboradoresInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function parseQuantidadeColaboradores(value: string): number {
  const qtd = Number(formatQuantidadeColaboradoresInput(value));
  return Number.isFinite(qtd) && qtd >= 1 ? qtd : 0;
}

export function isLegacyItemValorMultiplicado(item: {
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}): boolean {
  const qty = Number(item.quantidade);
  const unit = Number(item.valor_unitario);
  const total = Number(item.valor_total);
  if (qty <= 0 || unit <= 0 || total <= 0) return false;
  return Math.abs(total - qty * unit) <= LEGACY_VALOR_TOLERANCE;
}

/** Valor financeiro do serviço/pacote (não multiplica colaboradores). */
export function resolveItemValorServico(item: {
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}): number {
  const total = Number(item.valor_total);
  const unit = Number(item.valor_unitario);

  if (isLegacyItemValorMultiplicado(item)) {
    return unit;
  }

  if (total > 0) return total;
  if (unit > 0) return unit;
  return 0;
}

export function resolveItemValorForm(item: OrcamentoItemFormItem): number {
  if (item.valor_unitario.trim() !== "") {
    return parseMoney(item.valor_unitario);
  }
  if (item.valor_total.trim() !== "") {
    return parseMoney(item.valor_total);
  }
  return 0;
}

export function calcSubtotalItens(itens: OrcamentoItemFormItem[]): number {
  return itens.reduce((acc, item) => {
    if (!item.servico_nome.trim()) return acc;
    return acc + resolveItemValorForm(item);
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

function normalizeServicoNome(nome: string): string {
  return nome
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isPacoteCompletoNome(nome: string | null | undefined): boolean {
  return (
    normalizeServicoNome(nome ?? "") ===
    normalizeServicoNome(PACOTE_COMPLETO_SST_NOME)
  );
}

export function resolveQuantidadeColaboradoresOrcamento(
  orcamento: Pick<OrcamentoComItens, "orcamento_itens">
): number {
  const itens = [...(orcamento.orcamento_itens ?? [])].sort(
    (a, b) => a.ordem - b.ordem
  );
  if (itens.length === 0) return 0;

  const pacoteItem = itens.find(
    (item) =>
      isPacoteCompletoSst(item.servico_nome) ||
      isPacoteCompletoNome(item.servico_nome)
  );
  const referencia = pacoteItem ?? itens[0];
  const quantidade = Math.round(Number(referencia.quantidade));
  return Number.isFinite(quantidade) && quantidade >= 1 ? quantidade : 0;
}

export function resolveItemValorParaFormulario(
  item: OrcamentoItemRecord
): number {
  return resolveItemValorServico(item);
}

/** @deprecated Mantido apenas para referência; não multiplica por quantidade. */
export function calcItemTotal(
  _quantidade: string,
  valor: string
): number {
  return parseMoney(valor);
}

/** @deprecated Use formatQuantidadeColaboradoresInput */
export function formatQuantidadeDisplay(value: string): string {
  return formatQuantidadeColaboradoresInput(value);
}
