import { createClient } from "@/lib/supabase/client";
import type {
  OrcamentoAprovacaoCondicoesHistoricoRecord,
  OrcamentoAprovacaoInsertPayload,
  OrcamentoAprovacaoRecord,
  OrcamentoCondicoesComerciaisPayload,
  OrcamentoContratoDocumentalUpdatePayload,
  OrcamentoContratoUpdatePayload,
  OrcamentoFinanceiroUpdatePayload,
} from "@/lib/orcamento-aprovacao";
import {
  condicoesComerciaisMudaram,
  formatCondicaoAprovada,
  formatPagamentoFromCondicoes,
} from "@/lib/orcamento-aprovacao";
import { ORCAMENTO_JA_APROVADO_MSG } from "@/lib/orcamento-acoes";
import {
  assertOrcamentoCnpjParaAprovacao,
  parseAprovacaoIntegracaoError,
  type OrcamentoAprovacaoIntegracaoResult,
} from "@/lib/orcamento-aprovacao-integracao";
import { buildClienteContratoSyncFromAprovacao } from "@/lib/cliente-contrato-orcamento-sync";
import { vigenciaContratualConfiavel } from "@/lib/contrato-navarro";
import {
  isLaudoPontualExclusivo,
  laudoPontualOcultaColaboradores,
  resolveLaudoPontualKind,
} from "@/lib/servico-laudo-pontual";
import { condicaoAprovadaParecer } from "@/lib/contrato-parecer-tecnico";
import type { ParecerPagamentoEscolhido } from "@/lib/contrato-parecer-tecnico";
import { garantirImplantacaoAet } from "@/services/implantacao-aet.service";
import type { ClienteContratoStatus } from "@/lib/types";
import {
  CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG,
  ORCAMENTO_COM_CONTRATO_USE_ENCERRAR_MSG,
} from "@/lib/contrato-permissoes";
import { assertPodeEncerrarContrato } from "@/services/contrato-permissoes.service";
import {
  mensagemErroMensalidadePagamento,
  resolverMesesVigenciaMensalidade,
} from "@/lib/orcamento-mensalidade-pagamento";

const APROVACAO_SELECT = `
  *,
  orcamento_aprovacao_itens (*)
`;

export async function obterMesesVigenciaMensalidade(
  orcamentoId: string,
  mesesSalvos?: number | null
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("data_inicio, data_fim")
    .eq("orcamento_id", orcamentoId)
    .not("status", "in", "(encerrado,cancelado)")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) {
    return resolverMesesVigenciaMensalidade({ mesesSalvos });
  }
  const row = data?.[0] as
    | { data_inicio?: string | null; data_fim?: string | null }
    | undefined;
  return resolverMesesVigenciaMensalidade({
    dataInicio: row?.data_inicio,
    dataFim: row?.data_fim,
    mesesSalvos,
  });
}

/** Datas de vigência já gravadas no contrato do cliente. Não usa a data de emissão do PDF. */
export async function obterVigenciaContratualOrcamento(
  orcamentoId: string
): Promise<{ inicio: string; fim: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("data_inicio, data_fim")
    .eq("orcamento_id", orcamentoId)
    .not("status", "in", "(encerrado,cancelado)")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return null;
  const row = data?.[0] as
    | { data_inicio?: string | null; data_fim?: string | null }
    | undefined;
  return vigenciaContratualConfiavel(row?.data_inicio, row?.data_fim);
}

function sortAprovacao(
  data: OrcamentoAprovacaoRecord
): OrcamentoAprovacaoRecord {
  const next: OrcamentoAprovacaoRecord = {
    ...data,
    orcamento_aprovacao_itens: [
      ...(data.orcamento_aprovacao_itens ?? []),
    ].sort((a, b) => a.ordem - b.ordem),
  };
  if ("condicoes_revisao" in data) {
    const bruta = data.condicoes_revisao as unknown;
    if (bruta == null || bruta === "") {
      next.condicoes_revisao = null;
    } else {
      const numero = Number(bruta);
      next.condicoes_revisao = Number.isFinite(numero) ? numero : null;
    }
  }
  return next;
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
  if (isLaudoPontualExclusivo(aprovacao.orcamento_aprovacao_itens)) {
    return;
  }
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
    .select("status, responsavel")
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
        responsavel_no_fechamento: orcamentoAtual.responsavel ?? null,
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

  if (isLaudoPontualExclusivo(aprovacao.orcamento_aprovacao_itens)) {
    try {
      await garantirImplantacaoAet({
        orcamentoId,
        aprovacaoId: aprovacao.id,
        usuarioNome: payload.aprovado_por,
      });
    } catch (err) {
      console.error(
        "Falha ao iniciar implantação do laudo pontual após aprovação.",
        err
      );
    }
  }

  return { aprovacao, integracao };
}

/**
 * Atualiza as condições finais já aprovadas, sincroniza o contrato do cliente
 * e registra histórico append-only.
 */
export async function atualizarCondicoesAprovadas(
  aprovacaoId: string,
  payload: OrcamentoCondicoesComerciaisPayload,
  alteradoPor: string
): Promise<{
  aprovacao: OrcamentoAprovacaoRecord;
  historico: OrcamentoAprovacaoCondicoesHistoricoRecord;
}> {
  const supabase = createClient();
  const usuario = alteradoPor.trim();
  if (!usuario) {
    throw new Error("Informe o usuário responsável pela alteração.");
  }

  if (
    payload.mensalidade_pagamento === "mensal" ||
    payload.mensalidade_pagamento === "avista"
  ) {
    const { error: rpcError } = await supabase.rpc(
      "atualizar_condicoes_mensalidade_aprovadas",
      {
        p_aprovacao_id: aprovacaoId,
        p_quantidade: payload.quantidade_colaboradores,
        p_valor_mensal: payload.valor_final,
        p_forma: payload.mensalidade_pagamento,
        p_desconto_tipo: payload.mensalidade_desconto_tipo,
        p_desconto:
          payload.mensalidade_pagamento === "avista" &&
          payload.mensalidade_fonte !== "final"
            ? payload.mensalidade_desconto_informado ?? 0
            : 0,
        p_valor_final:
          payload.mensalidade_pagamento === "avista"
            ? payload.valor_avista
            : payload.valor_final,
        p_vencimento: payload.mensalidade_vencimento || null,
        p_observacoes: payload.observacoes,
        p_alterado_por: usuario,
        p_fonte: payload.mensalidade_fonte || "desconto",
      }
    );
    if (rpcError) {
      throw new Error(mensagemErroMensalidadePagamento(rpcError));
    }

    const { data: updatedRaw, error: reloadError } = await supabase
      .from("orcamento_aprovacoes")
      .select(APROVACAO_SELECT)
      .eq("id", aprovacaoId)
      .single();
    if (reloadError) throw reloadError;

    const { data: historicoRaw, error: historicoError } = await supabase
      .from("orcamento_aprovacao_condicoes_historico")
      .select("*")
      .eq("aprovacao_id", aprovacaoId)
      .order("alterado_em", { ascending: false })
      .limit(1)
      .single();
    if (historicoError) throw historicoError;

    return {
      aprovacao: sortAprovacao(updatedRaw as OrcamentoAprovacaoRecord),
      historico: historicoRaw as OrcamentoAprovacaoCondicoesHistoricoRecord,
    };
  }

  const { data: beforeRaw, error: beforeError } = await supabase
    .from("orcamento_aprovacoes")
    .select(APROVACAO_SELECT)
    .eq("id", aprovacaoId)
    .single();
  if (beforeError) throw beforeError;

  const before = sortAprovacao(beforeRaw as OrcamentoAprovacaoRecord);
  const isLaudoPontual = isLaudoPontualExclusivo(
    before.orcamento_aprovacao_itens
  );
  const ocultaColaboradores = laudoPontualOcultaColaboradores(
    resolveLaudoPontualKind(before.orcamento_aprovacao_itens)
  );
  if (!ocultaColaboradores && payload.quantidade_colaboradores < 1) {
    throw new Error("Informe a quantidade de colaboradores.");
  }
  if (payload.valor_final <= 0) {
    throw new Error("Informe o valor total fechado.");
  }
  if (!condicoesComerciaisMudaram(before, payload)) {
    throw new Error("Nenhuma alteração nas condições aprovadas.");
  }

  const { data: updatedRaw, error: updateError } = await supabase
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();
  if (updateError) throw updateError;

  const aprovacao = sortAprovacao(updatedRaw as OrcamentoAprovacaoRecord);

  if (!isLaudoPontual) {
  const { data: contratos, error: findContratosError } = await supabase
    .from("cliente_contratos")
    .select("id")
    .eq("orcamento_id", aprovacao.orcamento_id)
    .not("status", "in", "(encerrado,cancelado)");
  if (findContratosError) {
    throw new Error(
      `Falha ao localizar contrato para atualizar condições: ${findContratosError.message}`
    );
  }
  if (!contratos?.length) {
    throw new Error(
      "Contrato do cliente não encontrado para sincronizar as condições aprovadas."
    );
  }

  for (const row of contratos) {
    const { error: syncError } = await supabase
      .from("cliente_contratos")
      .update({
        quantidade_colaboradores: payload.quantidade_colaboradores,
        valor_contrato: payload.valor_final,
        condicao_pagamento: payload.condicao_pagamento,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (syncError) {
      throw new Error(
        `Falha ao sincronizar condições no contrato: ${syncError.message}`
      );
    }
  }
  }

  const { data: historicoRaw, error: historicoError } = await supabase
    .from("orcamento_aprovacao_condicoes_historico")
    .insert({
      aprovacao_id: aprovacao.id,
      orcamento_id: aprovacao.orcamento_id,
      alterado_por: usuario,
      quantidade_anterior: Number(before.quantidade_colaboradores) || 0,
      quantidade_nova: payload.quantidade_colaboradores,
      valor_anterior: Number(before.valor_final) || 0,
      valor_novo: payload.valor_final,
      pagamento_anterior: formatCondicaoAprovada(before),
      pagamento_novo: formatPagamentoFromCondicoes(payload),
      observacoes_anteriores: before.observacoes,
      observacoes_novas: payload.observacoes,
    })
    .select("*")
    .single();
  if (historicoError) throw historicoError;

  return {
    aprovacao,
    historico: historicoRaw as OrcamentoAprovacaoCondicoesHistoricoRecord,
  };
}

export async function listarHistoricoCondicoesAprovadas(
  aprovacaoId: string
): Promise<OrcamentoAprovacaoCondicoesHistoricoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacao_condicoes_historico")
    .select("*")
    .eq("aprovacao_id", aprovacaoId)
    .order("alterado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrcamentoAprovacaoCondicoesHistoricoRecord[];
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

  const { data: contratos, error: contratosError } = await supabase
    .from("cliente_contratos")
    .select("id, status, encerrado_em, numero")
    .eq("orcamento_id", params.id)
    .not("status", "in", "(encerrado,cancelado)")
    .limit(1);
  if (contratosError) throw contratosError;

  if (contratos && contratos.length > 0) {
    try {
      await assertPodeEncerrarContrato();
    } catch {
      throw new Error(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG);
    }
    throw new Error(ORCAMENTO_COM_CONTRATO_USE_ENCERRAR_MSG);
  }

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

function centavosIguais(a: number | null | undefined, b: number | null | undefined): boolean {
  return Math.round((Number(a) || 0) * 100) === Math.round((Number(b) || 0) * 100);
}

/**
 * Grava a condição escolhida para o contrato do Parecer Técnico.
 * Não sincroniza cliente_contratos e não inicia implantação de laudo.
 */
export async function salvarCondicaoContratoParecer(params: {
  orcamentoId: string;
  aprovacaoId: string;
  forma: ParecerPagamentoEscolhido;
  valorTotal: number;
  valorAvista: number;
  quantidadeParcelas: number;
  alteradoPor: string;
}): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const condicao = condicaoAprovadaParecer({
    forma: params.forma,
    valorTotal: params.valorTotal,
    valorAvista: params.valorAvista,
    quantidadeParcelas: params.quantidadeParcelas,
  });

  const { error: orcamentoError } = await supabase
    .from("orcamentos")
    .update({ parecer_pagamento_escolhido: params.forma })
    .eq("id", params.orcamentoId);
  if (orcamentoError) throw orcamentoError;

  const { data: beforeRaw, error: beforeError } = await supabase
    .from("orcamento_aprovacoes")
    .select(APROVACAO_SELECT)
    .eq("id", params.aprovacaoId)
    .single();
  if (beforeError) throw beforeError;
  const before = sortAprovacao(beforeRaw as OrcamentoAprovacaoRecord);

  const mudou =
    !centavosIguais(before.valor_final, condicao.valor_final) ||
    (before.condicao_pagamento ?? "") !== condicao.condicao_pagamento ||
    Number(before.quantidade_parcelas) !== condicao.quantidade_parcelas ||
    !centavosIguais(before.valor_parcela, condicao.valor_parcela) ||
    !centavosIguais(before.valor_avista, condicao.valor_avista) ||
    Number(before.desconto_percentual) !== 0;

  if (!mudou) return before;

  const { data: updatedRaw, error: updateError } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      valor_final: condicao.valor_final,
      condicao_pagamento: condicao.condicao_pagamento,
      quantidade_parcelas: condicao.quantidade_parcelas,
      valor_parcela: condicao.valor_parcela,
      valor_avista: condicao.valor_avista,
      desconto_percentual: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();
  if (updateError) throw updateError;
  const aprovacao = sortAprovacao(updatedRaw as OrcamentoAprovacaoRecord);

  const { error: historicoError } = await supabase
    .from("orcamento_aprovacao_condicoes_historico")
    .insert({
      aprovacao_id: aprovacao.id,
      orcamento_id: params.orcamentoId,
      alterado_por: params.alteradoPor.trim() || "Sistema",
      quantidade_anterior: Number(before.quantidade_colaboradores) || 0,
      quantidade_nova: Number(before.quantidade_colaboradores) || 0,
      valor_anterior: Number(before.valor_final) || 0,
      valor_novo: condicao.valor_final,
      pagamento_anterior: formatCondicaoAprovada(before),
      pagamento_novo: condicao.condicao_pagamento,
      observacoes_anteriores: before.observacoes,
      observacoes_novas: before.observacoes,
    });
  if (historicoError) throw historicoError;

  return aprovacao;
}
