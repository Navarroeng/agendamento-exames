import { maskMoneyInput, parseMoney } from "@/lib/money";
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

/** Base: 1 colaborador = R$ 1.300,00 */
export const PACOTE_COMPLETO_SST_PRECO_BASE = 1300;
/** Cada colaborador adicional: + R$ 100,00 */
export const PACOTE_COMPLETO_SST_PRECO_INCREMENTO = 100;
/** Automático somente até este limite (inclusive). */
export const PACOTE_COMPLETO_SST_QTD_AUTO_MAX = 20;

export function formatQuantidadeColaboradoresInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

export function parseQuantidadeColaboradores(value: string): number {
  const qtd = Number(formatQuantidadeColaboradoresInput(value));
  return Number.isFinite(qtd) && qtd >= 1 ? qtd : 0;
}

export function formatValorOrcamentoInput(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return "";
  return maskMoneyInput(String(Math.round(valor * 100)));
}

/**
 * Tabela Pacote completo - SST (1–20 colaboradores).
 * Retorna null quando a quantidade está fora da faixa automática.
 */
export function calcValorPacoteCompletoSst(
  quantidade: number
): number | null {
  const qtd = Math.round(Number(quantidade));
  if (
    !Number.isFinite(qtd) ||
    qtd < 1 ||
    qtd > PACOTE_COMPLETO_SST_QTD_AUTO_MAX
  ) {
    return null;
  }
  return (
    PACOTE_COMPLETO_SST_PRECO_BASE +
    (qtd - 1) * PACOTE_COMPLETO_SST_PRECO_INCREMENTO
  );
}

export function isPacoteCompletoSstValorAutomatico(
  servicoNome: string | null | undefined,
  quantidade: number
): boolean {
  if (!isPacoteCompletoSst(servicoNome) && !isPacoteCompletoNome(servicoNome)) {
    return false;
  }
  return calcValorPacoteCompletoSst(quantidade) != null;
}

/** Campo Valor permanece editável; mantido para compatibilidade com testes legados. */
export function isValorOrcamentoItemBloqueado(
  _servicoNome: string | null | undefined,
  _quantidade: string | number
): boolean {
  return false;
}

/** Valor persistido difere da tabela automática → tratar como negociado manualmente. */
export function inferValorManualOrcamentoItem(
  servicoNome: string | null | undefined,
  quantidade: number,
  valorPersistido: number
): boolean {
  if (!isPacoteCompletoSstValorAutomatico(servicoNome ?? "", quantidade)) {
    return false;
  }

  const auto = calcValorPacoteCompletoSst(quantidade);
  if (auto == null) return false;

  if (valorPersistido <= 0) return false;
  return Math.abs(valorPersistido - auto) > LEGACY_VALOR_TOLERANCE;
}

export function applyValorAutomaticoPacoteCompletoSstItem(
  item: Pick<
    OrcamentoItemFormItem,
    "servico_nome" | "quantidade" | "valor_unitario" | "valor_total"
  > & { valor_manual?: boolean }
): Pick<OrcamentoItemFormItem, "valor_unitario" | "valor_total"> {
  if (item.valor_manual) {
    return {
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
    };
  }

  const isPacote =
    isPacoteCompletoSst(item.servico_nome) ||
    isPacoteCompletoNome(item.servico_nome);
  if (!isPacote) {
    return {
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
    };
  }

  const qtd = parseQuantidadeColaboradores(item.quantidade);
  const auto = calcValorPacoteCompletoSst(qtd);
  if (auto != null) {
    const masked = formatValorOrcamentoInput(auto);
    return {
      valor_unitario: masked,
      valor_total: String(auto),
    };
  }

  // 21+: sem sugestão automática — campo vazio para preenchimento manual.
  if (qtd > PACOTE_COMPLETO_SST_QTD_AUTO_MAX) {
    return {
      valor_unitario: "",
      valor_total: "",
    };
  }

  return {
    valor_unitario: item.valor_unitario,
    valor_total: item.valor_total,
  };
}

/** Recalcula itens do pacote (1–20) no payload antes de persistir. */
export function applyPacoteCompletoSstPrecoItensPayload<
  T extends {
    servico_nome: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    valor_manual?: boolean;
  },
>(itens: T[]): T[] {
  return itens.map((item) => {
    if (item.valor_manual) return item;

    const auto = isPacoteCompletoSstValorAutomatico(
      item.servico_nome,
      item.quantidade
    )
      ? calcValorPacoteCompletoSst(item.quantidade)
      : null;
    if (auto == null) return item;
    return {
      ...item,
      valor_unitario: auto,
      valor_total: auto,
    };
  });
}

export function validateOrcamentoItensValores(
  itens: {
    servico_nome: string;
    quantidade: number;
    valor_unitario: number;
    valor_manual?: boolean;
  }[]
): string | null {
  for (const item of itens) {
    if (!item.servico_nome.trim()) continue;
    const qtd = Math.round(Number(item.quantidade));
    if (!Number.isFinite(qtd) || qtd < 1) {
      return "Informe quantidade de colaboradores válida (mínimo 1) para todos os serviços.";
    }

    if (Number(item.valor_unitario) < 0) {
      return "O valor do serviço não pode ser negativo.";
    }

    if (
      isPacoteCompletoSstValorAutomatico(item.servico_nome, qtd) &&
      !item.valor_manual
    ) {
      continue;
    }

    if (!(Number(item.valor_unitario) > 0)) {
      const isPacote =
        isPacoteCompletoSst(item.servico_nome) ||
        isPacoteCompletoNome(item.servico_nome);
      if (isPacote) {
        if (
          isPacoteCompletoSstValorAutomatico(item.servico_nome, qtd) &&
          item.valor_manual
        ) {
          return "Informe o valor negociado para o Pacote completo - SST.";
        }
        return "Para mais de 20 colaboradores do Pacote completo - SST, informe o valor negociado.";
      }
      return "Informe o valor de todos os serviços.";
    }
  }
  return null;
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
