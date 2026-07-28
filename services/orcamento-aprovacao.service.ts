import { createClient } from "@/lib/supabase/client";
import type {
  OrcamentoAprovacaoInsertPayload,
  OrcamentoAprovacaoRecord,
  OrcamentoContratoUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import {
  assertOrcamentoCnpjParaAprovacao,
  parseAprovacaoIntegracaoError,
  type OrcamentoAprovacaoIntegracaoResult,
} from "@/lib/orcamento-aprovacao-integracao";

const APROVACAO_SELECT = `
  *,
  orcamento_aprovacao_itens (*)
`;

function sortAprovacao(
  data: OrcamentoAprovacaoRecord
): OrcamentoAprovacaoRecord {
  return {
    ...data,
    orcamento_aprovacao_itens: [
      ...(data.orcamento_aprovacao_itens ?? []),
    ].sort((a, b) => a.ordem - b.ordem),
  };
}

export async function buscarAprovacaoPorOrcamentoId(
  orcamentoId: string
): Promise<OrcamentoAprovacaoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .select(APROVACAO_SELECT)
    .eq("orcamento_id", orcamentoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return sortAprovacao(data as OrcamentoAprovacaoRecord);
}

export interface SalvarAprovacaoOrcamentoResult {
  aprovacao: OrcamentoAprovacaoRecord;
  integracao: OrcamentoAprovacaoIntegracaoResult;
}

/**
 * Aprova o orçamento e integra cliente/contrato de forma atômica (RPC).
 * Exige CNPJ válido no orçamento.
 */
export async function salvarAprovacaoOrcamento(
  orcamentoId: string,
  payload: OrcamentoAprovacaoInsertPayload,
  orcamentoCnpj: string | null | undefined
): Promise<SalvarAprovacaoOrcamentoResult> {
  assertOrcamentoCnpjParaAprovacao(orcamentoCnpj);

  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "aprovar_orcamento_integrar_cliente",
    {
      p_orcamento_id: orcamentoId,
      p_aprovacao: {
        quantidade_colaboradores: payload.quantidade_colaboradores,
        valor_final: payload.valor_final,
        condicao_pagamento: payload.condicao_pagamento,
        quantidade_parcelas: payload.quantidade_parcelas,
        valor_parcela: payload.valor_parcela,
        desconto_percentual: payload.desconto_percentual,
        valor_avista: payload.valor_avista,
        observacoes: payload.observacoes,
        aprovado_por: payload.aprovado_por,
      },
      p_itens: payload.itens.map((item) => ({
        servico_id: item.servico_id,
        servico_nome: item.servico_nome,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        ordem: item.ordem,
      })),
    }
  );

  if (error) {
    throw new Error(parseAprovacaoIntegracaoError(error));
  }

  const integracao = data as OrcamentoAprovacaoIntegracaoResult;
  const aprovacao = await buscarAprovacaoPorOrcamentoId(orcamentoId);
  if (!aprovacao) {
    throw new Error("Aprovação não encontrada após salvar.");
  }

  return { aprovacao, integracao };
}

function resolveStatusContratoFromAprovacao(payload: {
  contrato_enviado: boolean;
  contrato_assinado: boolean;
  boleto_pago: boolean;
  boleto_vencimento: string | null;
}): string {
  if (payload.boleto_pago) return "pago";
  if (payload.contrato_assinado) {
    return payload.boleto_vencimento
      ? "aguardando_pagamento"
      : "assinado";
  }
  if (payload.contrato_enviado) return "enviado";
  return "aguardando_envio";
}

export async function atualizarAcompanhamentoContrato(
  aprovacaoId: string,
  payload: OrcamentoContratoUpdatePayload
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      contrato_enviado: payload.contrato_enviado,
      contrato_enviado_em: payload.contrato_enviado_em,
      contrato_assinado: payload.contrato_assinado,
      contrato_assinado_em: payload.contrato_assinado_em,
      observacao_contrato: payload.observacao_contrato,
      boleto_vencimento: payload.boleto_vencimento,
      boleto_pago: payload.boleto_pago,
      boleto_pago_em: payload.boleto_pago_em,
      comprovante_path: payload.comprovante_path,
      comprovante_nome: payload.comprovante_nome,
      comprovante_tipo: payload.comprovante_tipo,
      comprovante_tamanho: payload.comprovante_tamanho,
      observacao_pagamento: payload.observacao_pagamento,
    })
    .eq("id", aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();

  if (error) throw error;

  const aprovacao = sortAprovacao(data as OrcamentoAprovacaoRecord);
  const statusContrato = resolveStatusContratoFromAprovacao({
    contrato_enviado: aprovacao.contrato_enviado,
    contrato_assinado: aprovacao.contrato_assinado,
    boleto_pago: aprovacao.boleto_pago,
    boleto_vencimento: aprovacao.boleto_vencimento,
  });

  const { error: syncError } = await supabase
    .from("cliente_contratos")
    .update({
      status: statusContrato,
      contrato_enviado_em: aprovacao.contrato_enviado_em,
      contrato_assinado_em: aprovacao.contrato_assinado_em,
      boleto_vencimento: aprovacao.boleto_vencimento,
      boleto_pago: aprovacao.boleto_pago,
      boleto_pago_em: aprovacao.boleto_pago_em,
    })
    .eq("orcamento_id", aprovacao.orcamento_id)
    .not("status", "in", "(ativo,encerrado,em_renovacao,cancelado)");

  if (syncError) {
    console.error("Falha ao sincronizar status do contrato do cliente:", syncError);
  }

  return aprovacao;
}

/** Regulariza orçamentos já aprovados sem cliente/contrato (idempotente). */
export async function backfillOrcamentosAprovadosClientes(): Promise<{
  clientes_criados: number;
  clientes_localizados: number;
  contratos_criados: number;
  contratos_atualizados: number;
  pulados_sem_cnpj: number;
  orcamentos_ja_vinculados: number;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "backfill_orcamentos_aprovados_clientes"
  );
  if (error) throw error;
  return data as {
    clientes_criados: number;
    clientes_localizados: number;
    contratos_criados: number;
    contratos_atualizados: number;
    pulados_sem_cnpj: number;
    orcamentos_ja_vinculados: number;
  };
}

export async function cancelarOrcamento(params: {
  id: string;
  motivo: string;
  observacao: string | null;
  canceladoPor: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("orcamentos")
    .update({
      status: "cancelado",
      motivo_cancelamento: params.motivo.trim(),
      observacao_cancelamento: params.observacao,
      cancelado_em: new Date().toISOString(),
      cancelado_por: params.canceladoPor.trim(),
    })
    .eq("id", params.id)
    .neq("status", "cancelado");

  if (error) throw error;
}
