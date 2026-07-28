import { formatCurrency } from "@/lib/money";
import {
  calcCondicoesPagamentoProposta,
  calcValorParcela,
} from "@/lib/orcamento-pagamento";
import {
  resolveItemValorServico,
  resolveQuantidadeColaboradoresOrcamento,
} from "@/lib/orcamento-calculo";
import type { OrcamentoComItens } from "@/lib/orcamento-types";

export type OrcamentoContratoAndamento =
  | "nao_enviado"
  | "enviado"
  | "assinado"
  | "aguardando_pagamento"
  | "pago";

export const ORCAMENTO_CONTRATO_ANDAMENTO_LABELS: Record<
  OrcamentoContratoAndamento,
  string
> = {
  nao_enviado: "Não enviado",
  enviado: "Enviado",
  assinado: "Assinado",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
};

export type OrcamentoAprovacaoFormaPagamento = "avista" | "parcelado";

export interface OrcamentoAprovacaoItemRecord {
  id: string;
  aprovacao_id: string;
  servico_id: string | null;
  servico_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  ordem: number;
  created_at?: string;
}

export interface OrcamentoAprovacaoRecord {
  id: string;
  orcamento_id: string;
  quantidade_colaboradores: number;
  valor_final: number;
  condicao_pagamento: string | null;
  quantidade_parcelas: number | null;
  valor_parcela: number | null;
  desconto_percentual: number;
  valor_avista: number | null;
  observacoes: string | null;
  aprovado_por: string;
  aprovado_em: string;
  contrato_enviado: boolean;
  contrato_enviado_em: string | null;
  contrato_assinado: boolean;
  contrato_assinado_em: string | null;
  observacao_contrato: string | null;
  boleto_vencimento: string | null;
  boleto_pago: boolean;
  boleto_pago_em: string | null;
  comprovante_path: string | null;
  comprovante_nome: string | null;
  comprovante_tipo: string | null;
  comprovante_tamanho: number | null;
  observacao_pagamento: string | null;
  pagamento_confirmado_em?: string | null;
  pagamento_confirmado_por?: string | null;
  created_at: string;
  updated_at: string;
  orcamento_aprovacao_itens?: OrcamentoAprovacaoItemRecord[];
}

export interface OrcamentoAprovacaoFormValues {
  /** true = aprovar conforme o orçamento original (sem alterações). */
  condicoes_iguais: boolean;
  forma_pagamento: OrcamentoAprovacaoFormaPagamento;
  quantidade_colaboradores: string;
  valor_final: string;
  quantidade_parcelas: string;
  observacoes: string;
}

export interface OrcamentoAprovacaoInsertPayload {
  quantidade_colaboradores: number;
  valor_final: number;
  condicao_pagamento: string | null;
  quantidade_parcelas: number | null;
  valor_parcela: number | null;
  desconto_percentual: number;
  valor_avista: number | null;
  observacoes: string | null;
  aprovado_por: string;
  itens: Array<{
    servico_id: string | null;
    servico_nome: string;
    quantidade: number;
    valor_unitario: number;
    valor_total: number;
    ordem: number;
  }>;
}

export interface OrcamentoContratoDocumentalUpdatePayload {
  contrato_enviado: boolean;
  contrato_enviado_em: string | null;
  contrato_assinado: boolean;
  contrato_assinado_em: string | null;
  observacao_contrato: string | null;
}

export interface OrcamentoFinanceiroUpdatePayload {
  boleto_vencimento: string | null;
  boleto_pago: boolean;
  boleto_pago_em: string | null;
  comprovante_path: string | null;
  comprovante_nome: string | null;
  comprovante_tipo: string | null;
  comprovante_tamanho: number | null;
  observacao_pagamento: string | null;
  pagamento_confirmado_por?: string | null;
}

/** @deprecated Prefer payloads documentais/financeiros separados. */
export interface OrcamentoContratoUpdatePayload
  extends OrcamentoContratoDocumentalUpdatePayload,
    OrcamentoFinanceiroUpdatePayload {}

export type OrcamentoFinanceiroAndamento =
  | "aguardando_vencimento"
  | "aguardando_pagamento"
  | "pago";

export const ORCAMENTO_FINANCEIRO_ANDAMENTO_LABELS: Record<
  OrcamentoFinanceiroAndamento,
  string
> = {
  aguardando_vencimento: "Aguardando vencimento",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
};

export interface OrcamentoAprovacaoDiffItem {
  label: string;
  original: string;
  aprovado: string;
  changed: boolean;
}

export interface OrcamentoResumoComercial {
  quantidadeColaboradores: number;
  valorTotal: number;
  valorAVista: number;
  parcelas: number;
  valorParcela: number;
  textoParcelado: string;
  textoAVista: string;
}

export function resolveContratoAndamento(
  aprovacao: Pick<
    OrcamentoAprovacaoRecord,
    | "contrato_enviado"
    | "contrato_assinado"
    | "boleto_pago"
    | "boleto_vencimento"
  > | null
): OrcamentoContratoAndamento {
  if (!aprovacao) return "nao_enviado";
  if (aprovacao.boleto_pago) return "pago";
  if (aprovacao.contrato_assinado) {
    return aprovacao.boleto_vencimento
      ? "aguardando_pagamento"
      : "assinado";
  }
  if (aprovacao.contrato_enviado) return "enviado";
  return "nao_enviado";
}

/** Andamento apenas documental (aba Contrato). */
export function resolveContratoDocumentalAndamento(
  aprovacao: Pick<
    OrcamentoAprovacaoRecord,
    "contrato_enviado" | "contrato_assinado"
  > | null
): "nao_enviado" | "enviado" | "assinado" {
  if (!aprovacao) return "nao_enviado";
  if (aprovacao.contrato_assinado) return "assinado";
  if (aprovacao.contrato_enviado) return "enviado";
  return "nao_enviado";
}

export const ORCAMENTO_CONTRATO_DOCUMENTAL_LABELS: Record<
  "nao_enviado" | "enviado" | "assinado",
  string
> = {
  nao_enviado: "Aguardando envio",
  enviado: "Enviado",
  assinado: "Assinado",
};

export function resolveFinanceiroAndamento(
  aprovacao: Pick<
    OrcamentoAprovacaoRecord,
    "boleto_vencimento" | "boleto_pago"
  > | null
): OrcamentoFinanceiroAndamento {
  if (!aprovacao) return "aguardando_vencimento";
  if (aprovacao.boleto_pago) return "pago";
  if (aprovacao.boleto_vencimento) return "aguardando_pagamento";
  return "aguardando_vencimento";
}

export function buildResumoComercialOrcamento(
  orcamento: OrcamentoComItens
): OrcamentoResumoComercial {
  const quantidade = resolveQuantidadeColaboradoresOrcamento(orcamento) || 1;
  const valorTotal = Number(orcamento.valor_total) || 0;
  const pagamento = calcCondicoesPagamentoProposta(valorTotal);
  return {
    quantidadeColaboradores: quantidade,
    valorTotal,
    valorAVista: pagamento.valorAVista,
    parcelas: pagamento.parcelas,
    valorParcela: pagamento.valorParcela,
    textoParcelado: pagamento.textoParcelado,
    textoAVista: pagamento.textoAVista,
  };
}

function moneyToForm(value: number): string {
  return value > 0 ? value.toFixed(2).replace(".", ",") : "";
}

function copyItensFromOrcamento(
  orcamento: OrcamentoComItens
): OrcamentoAprovacaoInsertPayload["itens"] {
  const quantidade =
    resolveQuantidadeColaboradoresOrcamento(orcamento) || 1;
  return [...(orcamento.orcamento_itens ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item, index) => {
      const valor = resolveItemValorServico(item);
      return {
        servico_id: item.servico_id,
        servico_nome: item.servico_nome,
        quantidade: Number(item.quantidade) || quantidade,
        valor_unitario: valor,
        valor_total: valor,
        ordem: index,
      };
    });
}

function resolveFormaPagamentoFromRecord(
  aprovacao: OrcamentoAprovacaoRecord
): OrcamentoAprovacaoFormaPagamento {
  if (
    aprovacao.quantidade_parcelas != null &&
    aprovacao.quantidade_parcelas > 1
  ) {
    return "parcelado";
  }
  if (aprovacao.valor_parcela != null && Number(aprovacao.valor_parcela) > 0) {
    return "parcelado";
  }
  const condicao = (aprovacao.condicao_pagamento ?? "").toLowerCase();
  if (condicao.includes("x de") || /^\d+x\b/.test(condicao)) {
    return "parcelado";
  }
  return "avista";
}

export function aprovacaoSegueOrcamentoOriginal(
  orcamento: OrcamentoComItens,
  aprovacao: OrcamentoAprovacaoRecord
): boolean {
  const resumo = buildResumoComercialOrcamento(orcamento);
  const qtdOk =
    Number(aprovacao.quantidade_colaboradores) === resumo.quantidadeColaboradores;
  const valorOk =
    Math.abs(Number(aprovacao.valor_final) - resumo.valorTotal) < 0.009;
  return qtdOk && valorOk;
}

export function buildAprovacaoFormFromOrcamento(
  orcamento: OrcamentoComItens
): OrcamentoAprovacaoFormValues {
  const resumo = buildResumoComercialOrcamento(orcamento);
  return {
    condicoes_iguais: true,
    forma_pagamento: "parcelado",
    quantidade_colaboradores: String(resumo.quantidadeColaboradores),
    valor_final: moneyToForm(resumo.valorTotal),
    quantidade_parcelas: String(resumo.parcelas),
    observacoes: "",
  };
}

export function buildAprovacaoFormFromRecord(
  orcamento: OrcamentoComItens,
  aprovacao: OrcamentoAprovacaoRecord
): OrcamentoAprovacaoFormValues {
  const forma = resolveFormaPagamentoFromRecord(aprovacao);
  const iguais = aprovacaoSegueOrcamentoOriginal(orcamento, aprovacao);
  const resumo = buildResumoComercialOrcamento(orcamento);

  return {
    condicoes_iguais: iguais,
    forma_pagamento: forma,
    quantidade_colaboradores: String(aprovacao.quantidade_colaboradores),
    valor_final: moneyToForm(Number(aprovacao.valor_final) || 0),
    quantidade_parcelas:
      aprovacao.quantidade_parcelas != null
        ? String(aprovacao.quantidade_parcelas)
        : String(resumo.parcelas),
    observacoes: aprovacao.observacoes ?? "",
  };
}

export function buildAprovacaoInsertPayload(
  orcamento: OrcamentoComItens,
  form: OrcamentoAprovacaoFormValues,
  aprovadoPor: string,
  parseMoneyFn: (value: string) => number
): OrcamentoAprovacaoInsertPayload {
  const itens = copyItensFromOrcamento(orcamento);
  const resumo = buildResumoComercialOrcamento(orcamento);

  if (form.condicoes_iguais) {
    return {
      quantidade_colaboradores: resumo.quantidadeColaboradores,
      valor_final: resumo.valorTotal,
      condicao_pagamento: resumo.textoParcelado,
      quantidade_parcelas: resumo.parcelas,
      valor_parcela: resumo.valorParcela,
      desconto_percentual: 5,
      valor_avista: resumo.valorAVista > 0 ? resumo.valorAVista : null,
      observacoes: form.observacoes.trim() || null,
      aprovado_por: aprovadoPor.trim(),
      itens,
    };
  }

  const quantidade = Number(form.quantidade_colaboradores) || 1;
  const valorFinal = parseMoneyFn(form.valor_final);

  if (form.forma_pagamento === "avista") {
    return {
      quantidade_colaboradores: quantidade,
      valor_final: valorFinal,
      condicao_pagamento: "À vista",
      quantidade_parcelas: null,
      valor_parcela: null,
      desconto_percentual: 0,
      valor_avista: valorFinal > 0 ? valorFinal : null,
      observacoes: form.observacoes.trim() || null,
      aprovado_por: aprovadoPor.trim(),
      itens,
    };
  }

  const parcelas = Math.max(1, Number(form.quantidade_parcelas) || 1);
  const valorParcela = calcValorParcela(valorFinal, parcelas);
  const textoParcelado = `${parcelas}x de ${formatCurrency(valorParcela)}`;

  return {
    quantidade_colaboradores: quantidade,
    valor_final: valorFinal,
    condicao_pagamento: textoParcelado,
    quantidade_parcelas: parcelas,
    valor_parcela: valorParcela,
    desconto_percentual: 0,
    valor_avista: null,
    observacoes: form.observacoes.trim() || null,
    aprovado_por: aprovadoPor.trim(),
    itens,
  };
}

export function buildAprovacaoDiffs(
  orcamento: OrcamentoComItens,
  form: OrcamentoAprovacaoFormValues,
  parseMoneyFn: (value: string) => number
): OrcamentoAprovacaoDiffItem[] {
  if (form.condicoes_iguais) return [];

  const resumo = buildResumoComercialOrcamento(orcamento);
  const qtdAprovada = Number(form.quantidade_colaboradores) || 0;
  const valorAprovado = parseMoneyFn(form.valor_final);
  const parcelasAprovadas = Math.max(1, Number(form.quantidade_parcelas) || 1);
  const valorParcelaAprovado = calcValorParcela(valorAprovado, parcelasAprovadas);
  const pagamentoAprovado =
    form.forma_pagamento === "avista"
      ? `À vista · ${formatCurrency(valorAprovado)}`
      : `${parcelasAprovadas}x de ${formatCurrency(valorParcelaAprovado)}`;

  return [
    {
      label: "Quantidade de colaboradores",
      original: String(resumo.quantidadeColaboradores || "—"),
      aprovado: String(qtdAprovada || "—"),
      changed: resumo.quantidadeColaboradores !== qtdAprovada,
    },
    {
      label: "Valor",
      original: formatCurrency(resumo.valorTotal),
      aprovado: formatCurrency(valorAprovado),
      changed: Math.abs(resumo.valorTotal - valorAprovado) > 0.009,
    },
    {
      label: "Pagamento",
      original: `Parcelado · ${resumo.textoParcelado} · À vista ${resumo.textoAVista}`,
      aprovado: pagamentoAprovado,
      changed: true,
    },
  ];
}

export function formatCondicaoAprovada(
  aprovacao: OrcamentoAprovacaoRecord
): string {
  const forma = resolveFormaPagamentoFromRecord(aprovacao);
  if (forma === "avista") {
    const valor =
      aprovacao.valor_avista != null && Number(aprovacao.valor_avista) > 0
        ? Number(aprovacao.valor_avista)
        : Number(aprovacao.valor_final);
    return `À vista · ${formatCurrency(valor)}`;
  }
  if (
    aprovacao.quantidade_parcelas != null &&
    aprovacao.valor_parcela != null
  ) {
    return `${aprovacao.quantidade_parcelas}x de ${formatCurrency(
      Number(aprovacao.valor_parcela)
    )}`;
  }
  return aprovacao.condicao_pagamento?.trim() || "—";
}
