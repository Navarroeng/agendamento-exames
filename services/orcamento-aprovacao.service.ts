import { createClient } from "@/lib/supabase/client";
import type {
  OrcamentoAprovacaoInsertPayload,
  OrcamentoAprovacaoRecord,
  OrcamentoContratoUpdatePayload,
} from "@/lib/orcamento-aprovacao";

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

export async function salvarAprovacaoOrcamento(
  orcamentoId: string,
  payload: OrcamentoAprovacaoInsertPayload
): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const existente = await buscarAprovacaoPorOrcamentoId(orcamentoId);

  let aprovacaoId: string;

  if (existente) {
    const { error } = await supabase
      .from("orcamento_aprovacoes")
      .update({
        quantidade_colaboradores: payload.quantidade_colaboradores,
        valor_final: payload.valor_final,
        condicao_pagamento: payload.condicao_pagamento,
        quantidade_parcelas: payload.quantidade_parcelas,
        valor_parcela: payload.valor_parcela,
        desconto_percentual: payload.desconto_percentual,
        valor_avista: payload.valor_avista,
        observacoes: payload.observacoes,
        aprovado_por: payload.aprovado_por,
        aprovado_em: new Date().toISOString(),
      })
      .eq("id", existente.id);

    if (error) throw error;
    aprovacaoId = existente.id;

    const { error: deleteError } = await supabase
      .from("orcamento_aprovacao_itens")
      .delete()
      .eq("aprovacao_id", aprovacaoId);
    if (deleteError) throw deleteError;
  } else {
    const { data, error } = await supabase
      .from("orcamento_aprovacoes")
      .insert({
        orcamento_id: orcamentoId,
        quantidade_colaboradores: payload.quantidade_colaboradores,
        valor_final: payload.valor_final,
        condicao_pagamento: payload.condicao_pagamento,
        quantidade_parcelas: payload.quantidade_parcelas,
        valor_parcela: payload.valor_parcela,
        desconto_percentual: payload.desconto_percentual,
        valor_avista: payload.valor_avista,
        observacoes: payload.observacoes,
        aprovado_por: payload.aprovado_por,
      })
      .select("id")
      .single();

    if (error) throw error;
    aprovacaoId = data.id as string;
  }

  if (payload.itens.length > 0) {
    const { error: itensError } = await supabase
      .from("orcamento_aprovacao_itens")
      .insert(
        payload.itens.map((item) => ({
          aprovacao_id: aprovacaoId,
          servico_id: item.servico_id,
          servico_nome: item.servico_nome,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
          ordem: item.ordem,
        }))
      );
    if (itensError) throw itensError;
  }

  const { error: statusError } = await supabase
    .from("orcamentos")
    .update({ status: "aprovado" })
    .eq("id", orcamentoId);
  if (statusError) throw statusError;

  const saved = await buscarAprovacaoPorOrcamentoId(orcamentoId);
  if (!saved) throw new Error("Aprovação não encontrada após salvar.");
  return saved;
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
  return sortAprovacao(data as OrcamentoAprovacaoRecord);
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
