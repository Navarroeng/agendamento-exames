import { createClient } from "@/lib/supabase/client";
import type {
  OrcamentoAprovacaoInsertPayload,
  OrcamentoAprovacaoRecord,
  OrcamentoContratoDocumentalUpdatePayload,
  OrcamentoContratoUpdatePayload,
  OrcamentoFinanceiroUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import { ORCAMENTO_JA_APROVADO_MSG } from "@/lib/orcamento-acoes";
import {
  assertOrcamentoCnpjParaAprovacao,
  parseAprovacaoIntegracaoError,
  type OrcamentoAprovacaoIntegracaoResult,
} from "@/lib/orcamento-aprovacao-integracao";
import { buildClienteContratoSyncFromAprovacao } from "@/lib/cliente-contrato-orcamento-sync";
import type { ClienteContratoStatus } from "@/lib/types";

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

async function encerrarOutrosContratosAtivos(
  clienteId: string,
  excludeContratoId: string,
  dataReferencia: string
): Promise<void> {
  const supabase = createClient();
  const ref = dataReferencia.slice(0, 10);
  // Dia anterior ao início do novo contrato (quando possível).
  const fimAnterior = (() => {
    const d = new Date(`${ref}T12:00:00`);
    if (Number.isNaN(d.getTime())) return ref;
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const { error } = await supabase
    .from("cliente_contratos")
    .update({
      status: "encerrado" satisfies ClienteContratoStatus,
      data_fim: fimAnterior,
      updated_at: new Date().toISOString(),
    })
    .eq("cliente_id", clienteId)
    .eq("status", "ativo")
    .neq("id", excludeContratoId);
  if (error) {
    throw new Error(
      `Não foi possível encerrar o contrato ativo anterior: ${error.message}`
    );
  }
}

async function syncClienteContratoFromAprovacao(
  aprovacao: OrcamentoAprovacaoRecord
): Promise<void> {
  const supabase = createClient();
  const syncPayload = buildClienteContratoSyncFromAprovacao({
    aprovacao: {
      contrato_enviado: aprovacao.contrato_enviado,
      contrato_assinado: aprovacao.contrato_assinado,
      contrato_assinado_em: aprovacao.contrato_assinado_em,
      contrato_enviado_em: aprovacao.contrato_enviado_em,
      boleto_pago: aprovacao.boleto_pago,
      boleto_vencimento: aprovacao.boleto_vencimento,
      boleto_pago_em: aprovacao.boleto_pago_em,
    },
  });

  const { data: targets, error: findError } = await supabase
    .from("cliente_contratos")
    .select("id, cliente_id, status, data_inicio, data_fim")
    .eq("orcamento_id", aprovacao.orcamento_id)
    .not("status", "in", "(encerrado,cancelado)");

  if (findError) {
    throw new Error(
      `Falha ao localizar contrato para sincronizar: ${findError.message}`
    );
  }

  if (!targets?.length) {
    throw new Error(
      "Contrato do cliente não encontrado para sincronizar o financeiro. Verifique o vínculo orçamento ↔ contrato."
    );
  }

  const dataRef =
    (syncPayload.data_inicio as string | undefined) ||
    (targets[0].data_inicio as string | undefined) ||
    new Date().toISOString().slice(0, 10);

  // Crítico: encerrar outro ativo ANTES de promover este para ativo
  // (idx_cliente_contratos_um_ativo).
  if (syncPayload.status === "ativo") {
    for (const row of targets) {
      await encerrarOutrosContratosAtivos(
        row.cliente_id as string,
        row.id as string,
        dataRef
      );
    }
  }

  for (const row of targets) {
    const update: Record<string, unknown> = {
      status: syncPayload.status,
      contrato_enviado_em: syncPayload.contrato_enviado_em,
      contrato_assinado_em: syncPayload.contrato_assinado_em,
      boleto_vencimento: syncPayload.boleto_vencimento,
      boleto_pago: syncPayload.boleto_pago,
      boleto_pago_em: syncPayload.boleto_pago_em,
      liberado_para_agendamento: syncPayload.liberado_para_agendamento,
      updated_at: new Date().toISOString(),
    };

    // Preserva vigência já definida no contrato.
    const temVigencia =
      Boolean(String(row.data_inicio ?? "").trim()) &&
      Boolean(String(row.data_fim ?? "").trim());
    if (!temVigencia) {
      if (syncPayload.data_inicio) update.data_inicio = syncPayload.data_inicio;
      if (syncPayload.data_fim) update.data_fim = syncPayload.data_fim;
      if (syncPayload.tipo_contrato) {
        update.tipo_contrato = syncPayload.tipo_contrato;
      }
    }

    const { error: syncError } = await supabase
      .from("cliente_contratos")
      .update(update)
      .eq("id", row.id);

    if (syncError) {
      throw new Error(
        `Falha ao sincronizar contrato do cliente: ${syncError.message}`
      );
    }
  }

  const clienteId = targets[0].cliente_id as string;
  const { error: recomputeError } = await supabase.rpc(
    "recompute_cliente_disponivel_agendamento",
    { p_cliente_id: clienteId }
  );
  if (recomputeError) {
    throw new Error(
      `Falha ao recomputar disponibilidade de agendamento: ${recomputeError.message}`
    );
  }
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

  const { data: orcamentoAtual, error: statusError } = await supabase
    .from("orcamentos")
    .select("status")
    .eq("id", orcamentoId)
    .maybeSingle();

  if (statusError) throw statusError;
  if (!orcamentoAtual) {
    throw new Error("Orçamento não encontrado.");
  }
  if (orcamentoAtual.status === "aprovado") {
    throw new Error(ORCAMENTO_JA_APROVADO_MSG);
  }
  if (orcamentoAtual.status === "cancelado") {
    throw new Error("Orçamento cancelado não pode ser aprovado.");
  }

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

/** Salva apenas o acompanhamento documental (aba Contrato). */
export async function atualizarAcompanhamentoDocumentalContrato(
  aprovacaoId: string,
  payload: OrcamentoContratoDocumentalUpdatePayload
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
      contrato_salvo_em: new Date().toISOString(),
    })
    .eq("id", aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();

  if (error) throw error;

  const aprovacao = sortAprovacao(data as OrcamentoAprovacaoRecord);
  await syncClienteContratoFromAprovacao(aprovacao);
  return aprovacao;
}

/** Salva o acompanhamento financeiro (aba Financeiro). */
export async function atualizarAcompanhamentoFinanceiro(
  aprovacaoId: string,
  payload: OrcamentoFinanceiroUpdatePayload
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();

  const { data: before, error: beforeError } = await supabase
    .from("orcamento_aprovacoes")
    .select("boleto_pago")
    .eq("id", aprovacaoId)
    .single();
  if (beforeError) throw beforeError;

  const confirmingPayment = payload.boleto_pago && !before.boleto_pago;
  const revokingPayment = !payload.boleto_pago && Boolean(before.boleto_pago);

  const updateRow: Record<string, unknown> = {
    boleto_vencimento: payload.boleto_vencimento,
    boleto_pago: payload.boleto_pago,
    boleto_pago_em: payload.boleto_pago_em,
    comprovante_path: payload.comprovante_path,
    comprovante_nome: payload.comprovante_nome,
    comprovante_tipo: payload.comprovante_tipo,
    comprovante_tamanho: payload.comprovante_tamanho,
    observacao_pagamento: payload.observacao_pagamento,
    financeiro_salvo_em: new Date().toISOString(),
  };

  if (confirmingPayment) {
    updateRow.pagamento_confirmado_em = new Date().toISOString();
    updateRow.pagamento_confirmado_por =
      payload.pagamento_confirmado_por?.trim() || null;
  } else if (revokingPayment) {
    // Mantém histórico de confirmação anterior; não apaga comprovante.
  }

  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .update(updateRow)
    .eq("id", aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();

  if (error) throw error;

  const aprovacao = sortAprovacao(data as OrcamentoAprovacaoRecord);
  await syncClienteContratoFromAprovacao(aprovacao);
  return aprovacao;
}

/**
 * @deprecated Use atualizarAcompanhamentoDocumentalContrato /
 * atualizarAcompanhamentoFinanceiro.
 */
export async function atualizarAcompanhamentoContrato(
  aprovacaoId: string,
  payload: OrcamentoContratoUpdatePayload
): Promise<OrcamentoAprovacaoRecord> {
  await atualizarAcompanhamentoDocumentalContrato(aprovacaoId, {
    contrato_enviado: payload.contrato_enviado,
    contrato_enviado_em: payload.contrato_enviado_em,
    contrato_assinado: payload.contrato_assinado,
    contrato_assinado_em: payload.contrato_assinado_em,
    observacao_contrato: payload.observacao_contrato,
  });
  return atualizarAcompanhamentoFinanceiro(aprovacaoId, {
    boleto_vencimento: payload.boleto_vencimento,
    boleto_pago: payload.boleto_pago,
    boleto_pago_em: payload.boleto_pago_em,
    comprovante_path: payload.comprovante_path,
    comprovante_nome: payload.comprovante_nome,
    comprovante_tipo: payload.comprovante_tipo,
    comprovante_tamanho: payload.comprovante_tamanho,
    observacao_pagamento: payload.observacao_pagamento,
    pagamento_confirmado_por: payload.pagamento_confirmado_por,
  });
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
    .not("status", "in", '("cancelado","contrato_encerrado")');

  if (error) throw error;
}
