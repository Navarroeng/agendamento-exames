import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import {
  CONTRATO_VIGENCIA_MENSALIDADE_MESES,
  buildClausulasContrato,
  redigirContratada,
  redigirContratante,
  textoPlanoContrato,
  type ContratoClausula,
  type ContratoNavarroContexto,
  type ContratoParteContratante,
} from "@/lib/contrato-navarro";
import {
  montarMensalidades,
  montarParcelasPontual,
  type ContratoParcela,
} from "@/lib/contrato-pagamento";
import { resolveQuantidadeColaboradoresOrcamento } from "@/lib/orcamento-calculo";
import {
  formatValorMensalidade,
  isOrcamentoMensalidade,
  resolveOrcamentoModalidade,
  type OrcamentoModalidade,
} from "@/lib/orcamento-modalidade";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoComItens } from "@/lib/orcamento-types";
import { formatCurrency } from "@/lib/money";

export type ContratoNavarroDocumento = {
  modalidade: OrcamentoModalidade;
  numeroOrcamento: string;
  dataContrato: string;
  contratante: ContratoParteContratante;
  colaboradores: number;
  valor: number;
  condicaoPagamento: string | null;
  parcelas: ContratoParcela[];
  servicos: string[];
  clausulas: ContratoClausula[];
  texto: string;
};

export function hojeIsoLocal(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function resolveColaboradores(
  orcamento: OrcamentoComItens,
  aprovacao: OrcamentoAprovacaoRecord | null
): number {
  const fromAprovacao = Number(aprovacao?.quantidade_colaboradores);
  if (Number.isFinite(fromAprovacao) && fromAprovacao >= 1) {
    return Math.round(fromAprovacao);
  }
  return resolveQuantidadeColaboradoresOrcamento(orcamento);
}

function resolveValor(
  orcamento: OrcamentoComItens,
  aprovacao: OrcamentoAprovacaoRecord | null
): number {
  const fromAprovacao = Number(aprovacao?.valor_final);
  if (Number.isFinite(fromAprovacao) && fromAprovacao > 0) {
    return fromAprovacao;
  }
  return Number(orcamento.valor_total) || 0;
}

function resolveParcelasQuantidade(
  orcamento: OrcamentoComItens,
  aprovacao: OrcamentoAprovacaoRecord | null
): number {
  const fromAprovacao = Number(aprovacao?.quantidade_parcelas);
  if (Number.isFinite(fromAprovacao) && fromAprovacao >= 1) {
    return Math.floor(fromAprovacao);
  }
  const fromOrcamento = Number(orcamento.quantidade_parcelas);
  if (Number.isFinite(fromOrcamento) && fromOrcamento >= 1) {
    return Math.floor(fromOrcamento);
  }
  return 1;
}

function resolveServicos(
  orcamento: OrcamentoComItens,
  aprovacao: OrcamentoAprovacaoRecord | null
): string[] {
  const itensAprov =
    aprovacao?.orcamento_aprovacao_itens?.slice().sort((a, b) => a.ordem - b.ordem) ??
    [];
  if (itensAprov.length > 0) {
    return itensAprov.map((i) => i.servico_nome).filter(Boolean);
  }
  return [...(orcamento.orcamento_itens ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((i) => i.servico_nome)
    .filter(Boolean);
}

export function podeGerarContratoNavarro(
  orcamento: OrcamentoComItens | null | undefined,
  aprovacao: OrcamentoAprovacaoRecord | null | undefined
): boolean {
  if (!orcamento?.id || !orcamento.numero?.trim()) return false;
  if (!aprovacao?.id) return false;
  return Boolean(orcamento.cliente_nome?.trim());
}

export function formatValorContratoResumo(
  modalidade: OrcamentoModalidade,
  valor: number
): string {
  return isOrcamentoMensalidade(modalidade)
    ? formatValorMensalidade(valor)
    : formatCurrency(valor);
}

export function buildContratoNavarroDocumento(params: {
  orcamento: OrcamentoComItens;
  aprovacao: OrcamentoAprovacaoRecord | null;
  dataContrato: string;
}): ContratoNavarroDocumento {
  const { orcamento, aprovacao, dataContrato } = params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataContrato)) {
    throw new Error("Informe a data do contrato no formato AAAA-MM-DD.");
  }

  const modalidade = resolveOrcamentoModalidade(orcamento.modalidade);
  const valor = resolveValor(orcamento, aprovacao);
  const colaboradores = resolveColaboradores(orcamento, aprovacao);
  const mensalidade = isOrcamentoMensalidade(modalidade);

  const parcelas = mensalidade
    ? montarMensalidades({
        valorMensal: valor,
        quantidade: CONTRATO_VIGENCIA_MENSALIDADE_MESES,
        dataContrato,
      })
    : montarParcelasPontual({
        valorTotal: valor,
        quantidadeParcelas: resolveParcelasQuantidade(orcamento, aprovacao),
        dataContrato,
      });

  const contratante: ContratoParteContratante = {
    razaoSocial: orcamento.cliente_nome.trim(),
    cnpj: orcamento.cliente_cnpj?.trim() || null,
    endereco: orcamento.cliente_endereco?.trim() || null,
    telefone: orcamento.telefone?.trim() || null,
    email: orcamento.email?.trim() || null,
    setor: orcamento.cliente_setor?.trim() || null,
  };

  const ctx: ContratoNavarroContexto = {
    modalidade,
    numeroOrcamento: orcamento.numero.trim(),
    dataContrato,
    contratante,
    colaboradores,
    valor,
    condicaoPagamento: mensalidade
      ? `${CONTRATO_VIGENCIA_MENSALIDADE_MESES} mensalidades`
      : aprovacao?.condicao_pagamento?.trim() ||
        orcamento.forma_pagamento?.trim() ||
        null,
    parcelas,
    servicos: resolveServicos(orcamento, aprovacao),
  };

  const clausulas = buildClausulasContrato(ctx);
  return {
    ...ctx,
    clausulas,
    texto: textoPlanoContrato(clausulas),
  };
}

export function resumoConferenciaContrato(doc: ContratoNavarroDocumento): {
  cliente: string;
  cnpj: string;
  orcamento: string;
  modalidade: string;
  colaboradores: string;
  valor: string;
  dataContrato: string;
  contratanteRedacao: string;
  contratadaRedacao: string;
} {
  return {
    cliente: doc.contratante.razaoSocial,
    cnpj: doc.contratante.cnpj?.trim() || "—",
    orcamento: doc.numeroOrcamento,
    modalidade:
      doc.modalidade === "mensalidade" ? "Mensalidade" : "Pontual",
    colaboradores:
      doc.colaboradores >= 1 ? String(doc.colaboradores) : "—",
    valor: formatValorContratoResumo(doc.modalidade, doc.valor),
    dataContrato: formatDateIsoToBR(doc.dataContrato),
    contratanteRedacao: redigirContratante(doc.contratante),
    contratadaRedacao: redigirContratada(),
  };
}
