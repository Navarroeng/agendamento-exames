import { formatCurrency } from "@/lib/money";
import { calcCondicoesPagamentoProposta } from "@/lib/orcamento-pagamento";
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
  created_at: string;
  updated_at: string;
  orcamento_aprovacao_itens?: OrcamentoAprovacaoItemRecord[];
}

export interface OrcamentoAprovacaoItemForm {
  id: string;
  servico_id: string;
  servico_nome: string;
  quantidade: string;
  valor_unitario: string;
}

export interface OrcamentoAprovacaoFormValues {
  quantidade_colaboradores: string;
  valor_final: string;
  condicao_pagamento: string;
  quantidade_parcelas: string;
  valor_parcela: string;
  desconto_percentual: string;
  valor_avista: string;
  observacoes: string;
  itens: OrcamentoAprovacaoItemForm[];
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

export interface OrcamentoContratoUpdatePayload {
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
}

export interface OrcamentoAprovacaoDiffItem {
  label: string;
  original: string;
  aprovado: string;
  changed: boolean;
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

export function buildAprovacaoInsertPayload(
  form: OrcamentoAprovacaoFormValues,
  aprovadoPor: string,
  parseMoneyFn: (value: string) => number
): OrcamentoAprovacaoInsertPayload {
  const itens = form.itens
    .filter((item) => item.servico_nome.trim())
    .map((item, index) => {
      const quantidade = Number(item.quantidade) || 1;
      const valorUnitario = parseMoneyFn(item.valor_unitario);
      return {
        servico_id: item.servico_id.trim() || null,
        servico_nome: item.servico_nome.trim(),
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: quantidade * valorUnitario,
        ordem: index,
      };
    });

  const parcelas = Number(form.quantidade_parcelas);
  const desconto = Number(form.desconto_percentual);
  const valorParcela = parseMoneyFn(form.valor_parcela);
  const valorAvista = parseMoneyFn(form.valor_avista);

  return {
    quantidade_colaboradores: Number(form.quantidade_colaboradores) || 1,
    valor_final: parseMoneyFn(form.valor_final),
    condicao_pagamento: form.condicao_pagamento.trim() || null,
    quantidade_parcelas:
      Number.isFinite(parcelas) && parcelas >= 1 ? parcelas : null,
    valor_parcela: valorParcela > 0 ? valorParcela : null,
    desconto_percentual:
      Number.isFinite(desconto) && desconto >= 0 ? desconto : 0,
    valor_avista: valorAvista > 0 ? valorAvista : null,
    observacoes: form.observacoes.trim() || null,
    aprovado_por: aprovadoPor.trim(),
    itens,
  };
}

export function buildAprovacaoFormFromOrcamento(
  orcamento: OrcamentoComItens
): OrcamentoAprovacaoFormValues {
  const quantidade = String(
    resolveQuantidadeColaboradoresOrcamento(orcamento) || 1
  );
  const valorTotal = Number(orcamento.valor_total) || 0;
  const pagamento = calcCondicoesPagamentoProposta(valorTotal);
  const itens = [...(orcamento.orcamento_itens ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => {
      const valor = resolveItemValorServico(item);
      return {
        id: crypto.randomUUID(),
        servico_id: item.servico_id ?? "",
        servico_nome: item.servico_nome,
        quantidade: String(item.quantidade || quantidade),
        valor_unitario:
          valor > 0 ? valor.toFixed(2).replace(".", ",") : "",
      };
    });

  return {
    quantidade_colaboradores: quantidade,
    valor_final:
      valorTotal > 0 ? valorTotal.toFixed(2).replace(".", ",") : "",
    condicao_pagamento: pagamento.textoParcelado,
    quantidade_parcelas: String(pagamento.parcelas),
    valor_parcela:
      pagamento.valorParcela > 0
        ? pagamento.valorParcela.toFixed(2).replace(".", ",")
        : "",
    desconto_percentual: "5",
    valor_avista:
      pagamento.valorAVista > 0
        ? pagamento.valorAVista.toFixed(2).replace(".", ",")
        : "",
    observacoes: orcamento.observacoes ?? "",
    itens:
      itens.length > 0
        ? itens
        : [
            {
              id: crypto.randomUUID(),
              servico_id: "",
              servico_nome: "",
              quantidade,
              valor_unitario: "",
            },
          ],
  };
}

export function buildAprovacaoFormFromRecord(
  aprovacao: OrcamentoAprovacaoRecord
): OrcamentoAprovacaoFormValues {
  const itens = [...(aprovacao.orcamento_aprovacao_itens ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => ({
      id: item.id,
      servico_id: item.servico_id ?? "",
      servico_nome: item.servico_nome,
      quantidade: String(item.quantidade),
      valor_unitario:
        Number(item.valor_unitario) > 0
          ? Number(item.valor_unitario).toFixed(2).replace(".", ",")
          : "",
    }));

  return {
    quantidade_colaboradores: String(aprovacao.quantidade_colaboradores),
    valor_final:
      Number(aprovacao.valor_final) > 0
        ? Number(aprovacao.valor_final).toFixed(2).replace(".", ",")
        : "",
    condicao_pagamento: aprovacao.condicao_pagamento ?? "",
    quantidade_parcelas:
      aprovacao.quantidade_parcelas != null
        ? String(aprovacao.quantidade_parcelas)
        : "",
    valor_parcela:
      aprovacao.valor_parcela != null && Number(aprovacao.valor_parcela) > 0
        ? Number(aprovacao.valor_parcela).toFixed(2).replace(".", ",")
        : "",
    desconto_percentual: String(aprovacao.desconto_percentual ?? 0),
    valor_avista:
      aprovacao.valor_avista != null && Number(aprovacao.valor_avista) > 0
        ? Number(aprovacao.valor_avista).toFixed(2).replace(".", ",")
        : "",
    observacoes: aprovacao.observacoes ?? "",
    itens:
      itens.length > 0
        ? itens
        : [
            {
              id: crypto.randomUUID(),
              servico_id: "",
              servico_nome: "",
              quantidade: String(aprovacao.quantidade_colaboradores || 1),
              valor_unitario: "",
            },
          ],
  };
}

export function buildAprovacaoDiffs(
  orcamento: OrcamentoComItens,
  form: OrcamentoAprovacaoFormValues,
  parseMoneyFn: (value: string) => number
): OrcamentoAprovacaoDiffItem[] {
  const qtdOriginal = resolveQuantidadeColaboradoresOrcamento(orcamento);
  const valorOriginal = Number(orcamento.valor_total) || 0;
  const pagamentoOriginal = calcCondicoesPagamentoProposta(valorOriginal);
  const qtdAprovada = Number(form.quantidade_colaboradores) || 0;
  const valorAprovado = parseMoneyFn(form.valor_final);
  const parcelasAprovadas = Number(form.quantidade_parcelas) || 0;
  const valorParcelaAprovado = parseMoneyFn(form.valor_parcela);

  const servicosOriginal = [...(orcamento.orcamento_itens ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((i) => i.servico_nome)
    .filter(Boolean)
    .join(", ");
  const servicosAprovado = form.itens
    .map((i) => i.servico_nome.trim())
    .filter(Boolean)
    .join(", ");

  const rows: OrcamentoAprovacaoDiffItem[] = [
    {
      label: "Quantidade de colaboradores",
      original: String(qtdOriginal || "—"),
      aprovado: String(qtdAprovada || "—"),
      changed: qtdOriginal !== qtdAprovada,
    },
    {
      label: "Serviços",
      original: servicosOriginal || "—",
      aprovado: servicosAprovado || "—",
      changed: servicosOriginal !== servicosAprovado,
    },
    {
      label: "Valor",
      original: formatCurrency(valorOriginal),
      aprovado: formatCurrency(valorAprovado),
      changed: Math.abs(valorOriginal - valorAprovado) > 0.009,
    },
    {
      label: "Parcelamento",
      original: pagamentoOriginal.textoParcelado,
      aprovado:
        parcelasAprovadas > 0 && valorParcelaAprovado > 0
          ? `${parcelasAprovadas}x de ${formatCurrency(valorParcelaAprovado)}`
          : form.condicao_pagamento.trim() || "—",
      changed:
        pagamentoOriginal.textoParcelado !==
        (parcelasAprovadas > 0 && valorParcelaAprovado > 0
          ? `${parcelasAprovadas}x de ${formatCurrency(valorParcelaAprovado)}`
          : form.condicao_pagamento.trim()),
    },
  ];

  return rows;
}
