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
  APROVACAO_NAO_PERSISTIDA_MSG,
  APROVACAO_REVERTIDA_NAO_VIGENTE_MSG,
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
import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  buildClienteContratoSyncFromAprovacao,
  deveEncerrarAtivoAnteriorNaSincronizacao,
  statusContratoAposSyncComAtivoExistente,
} from "@/lib/cliente-contrato-orcamento-sync";
import { usaControleParcelasMensalidade } from "@/lib/mensalidade-parcelas";
import {
  CONTRATO_ADICIONAL_MENSALIDADE,
  DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG,
  GESTAO_SST_RENOVACAO_BASE_REAIS,
  GESTAO_SST_RENOVACAO_INCREMENTO_REAIS,
  centavosSalvosParaReais,
  diaVencimentoMensalidadeValido,
  vigenciaContratualConfiavel,
  type DiaVencimentoMensalidade,
} from "@/lib/contrato-navarro";
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
import { CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG } from "@/lib/contrato-vencimentos";
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

function centavosPositivos(value: number | null | undefined): number | null {
  const numero = Number(value);
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.round(numero);
}

/**
 * Grava o dia 10 ou 20 e, na primeira vez, congela fórmula e preço de exame
 * desta contratação. Não altera parâmetros já gravados.
 */
export async function salvarParametrosContratoMensalidade(params: {
  aprovacaoId: string;
  diaVencimento: DiaVencimentoMensalidade;
}): Promise<OrcamentoAprovacaoRecord> {
  const dia = diaVencimentoMensalidadeValido(params.diaVencimento);
  if (!dia) throw new Error(DIA_VENCIMENTO_MENSALIDADE_PENDENTE_MSG);

  const supabase = createClient();
  const { data: beforeRaw, error: beforeError } = await supabase
    .from("orcamento_aprovacoes")
    .select(APROVACAO_SELECT)
    .eq("id", params.aprovacaoId)
    .single();
  if (beforeError) throw beforeError;
  const before = sortAprovacao(beforeRaw as OrcamentoAprovacaoRecord);
  if (before.revertida_em) {
    throw new Error(APROVACAO_REVERTIDA_NAO_VIGENTE_MSG);
  }

  const baseSalva = centavosPositivos(before.mensalidade_renovacao_base_centavos);
  const incrementoSalvo = centavosPositivos(
    before.mensalidade_renovacao_incremento_centavos
  );
  const exameAdmissional = centavosPositivos(before.mensalidade_exame_avulso_centavos);
  const exameDemissional = centavosPositivos(
    before.mensalidade_exame_demissional_centavos
  );
  const diaSalvo = diaVencimentoMensalidadeValido(before.mensalidade_dia_vencimento);

  if (
    diaSalvo === dia &&
    baseSalva != null &&
    incrementoSalvo != null &&
    exameAdmissional != null &&
    exameDemissional != null
  ) {
    return before;
  }

  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      mensalidade_dia_vencimento: dia,
      mensalidade_renovacao_base_centavos:
        baseSalva ?? Math.round(GESTAO_SST_RENOVACAO_BASE_REAIS * 100),
      mensalidade_renovacao_incremento_centavos:
        incrementoSalvo ?? Math.round(GESTAO_SST_RENOVACAO_INCREMENTO_REAIS * 100),
      mensalidade_exame_avulso_centavos:
        exameAdmissional ?? CONTRATO_ADICIONAL_MENSALIDADE.admissionalCentavos,
      mensalidade_exame_demissional_centavos:
        exameDemissional ?? CONTRATO_ADICIONAL_MENSALIDADE.demissionalCentavos,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();
  if (error) throw error;
  return sortAprovacao(data as OrcamentoAprovacaoRecord);
}

/** Grava a renovação da Gestão SST mensal. Contrato assinado não é alterado. */
export async function salvarRenovacaoContratoMensalidade(params: {
  aprovacaoId: string;
  renovacaoAutomatica: boolean;
}): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { data: beforeRaw, error: beforeError } = await supabase
    .from("orcamento_aprovacoes")
    .select(APROVACAO_SELECT)
    .eq("id", params.aprovacaoId)
    .single();
  if (beforeError) throw beforeError;
  const before = sortAprovacao(beforeRaw as OrcamentoAprovacaoRecord);
  if (before.revertida_em) {
    throw new Error(APROVACAO_REVERTIDA_NAO_VIGENTE_MSG);
  }
  if (before.contrato_assinado) {
    throw new Error(CONTRATO_ASSINADO_BLOQUEIA_REGENERACAO_MSG);
  }
  if (before.mensalidade_renovacao_automatica === params.renovacaoAutomatica) {
    return before;
  }
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      mensalidade_renovacao_automatica: params.renovacaoAutomatica,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();
  if (error) throw error;
  return sortAprovacao(data as OrcamentoAprovacaoRecord);
}

/** Dia e parâmetros já gravados na contratação, para a proposta não inventar o vencimento. */
export async function obterParametrosPropostaMensalidade(
  orcamentoId: string
): Promise<{
  dia: DiaVencimentoMensalidade | null;
  baseReais: number | null;
  incrementoReais: number | null;
  exameAdmissional: number | null;
  exameDemissional: number | null;
}> {
  const vazio = {
    dia: null,
    baseReais: null,
    incrementoReais: null,
    exameAdmissional: null,
    exameDemissional: null,
  };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .select(
      "mensalidade_dia_vencimento, mensalidade_renovacao_base_centavos, mensalidade_renovacao_incremento_centavos, mensalidade_exame_avulso_centavos, mensalidade_exame_demissional_centavos"
    )
    .eq("orcamento_id", orcamentoId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error || !data?.length) return vazio;
  const row = data[0] as {
    mensalidade_dia_vencimento?: number | null;
    mensalidade_renovacao_base_centavos?: number | null;
    mensalidade_renovacao_incremento_centavos?: number | null;
    mensalidade_exame_avulso_centavos?: number | null;
    mensalidade_exame_demissional_centavos?: number | null;
  };
  return {
    dia: diaVencimentoMensalidadeValido(row.mensalidade_dia_vencimento),
    baseReais: centavosSalvosParaReais(row.mensalidade_renovacao_base_centavos),
    incrementoReais: centavosSalvosParaReais(
      row.mensalidade_renovacao_incremento_centavos
    ),
    exameAdmissional: centavosSalvosParaReais(row.mensalidade_exame_avulso_centavos),
    exameDemissional: centavosSalvosParaReais(
      row.mensalidade_exame_demissional_centavos
    ),
  };
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

/**
 * Substituição automática de vigência: só status, sem encerrado_em.
 * Preencher encerrado_em dispara trg_cliente_contratos_encerrar_somente_admin.
 */
async function encerrarOutrosContratosAtivos(
  clienteId: string,
  excludeContratoId: string
): Promise<void> {
  const supabase = createClient();
  const agora = new Date().toISOString();

  const { error } = await supabase
    .from("cliente_contratos")
    .update({
      status: "encerrado" satisfies ClienteContratoStatus,
      updated_at: agora,
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

async function temOutroContratoAtivo(
  clienteId: string,
  excludeContratoId: string
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("id")
    .eq("cliente_id", clienteId)
    .eq("status", "ativo")
    .neq("id", excludeContratoId)
    .limit(1);
  if (error) {
    throw new Error(
      `Falha ao verificar contrato ativo anterior: ${error.message}`
    );
  }
  return Boolean(data?.length);
}

async function syncClienteContratoFromAprovacao(
  aprovacao: OrcamentoAprovacaoRecord,
  opts?: { permitirEncerrarAtivoAnterior?: boolean }
): Promise<void> {
  if (isLaudoPontualExclusivo(aprovacao.orcamento_aprovacao_itens)) {
    return;
  }
  const supabase = createClient();
  const { data: orcamentoModalidade } = await supabase
    .from("orcamentos")
    .select("modalidade")
    .eq("id", aprovacao.orcamento_id)
    .maybeSingle();
  const cobrancaMensal = usaControleParcelasMensalidade(
    orcamentoModalidade?.modalidade,
    aprovacao.mensalidade_pagamento
  );
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
    cobrancaMensal,
    hojeIso: todayIsoSaoPaulo(),
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

  const outroAtivoPorContrato = new Map<string, boolean>();
  for (const row of targets) {
    const encerrarOutro = deveEncerrarAtivoAnteriorNaSincronizacao({
      statusDestino: syncPayload.status,
      statusAtual: String(row.status ?? ""),
      permitirEncerrarAtivoAnterior: Boolean(
        opts?.permitirEncerrarAtivoAnterior
      ),
      cobrancaMensal,
    });
    if (encerrarOutro) {
      // idx_cliente_contratos_um_ativo: encerra o anterior só na substituição mensal.
      await encerrarOutrosContratosAtivos(
        row.cliente_id as string,
        row.id as string
      );
      outroAtivoPorContrato.set(row.id as string, false);
      continue;
    }
    if (syncPayload.status === "ativo" && row.status !== "ativo") {
      outroAtivoPorContrato.set(
        row.id as string,
        await temOutroContratoAtivo(row.cliente_id as string, row.id as string)
      );
    } else {
      outroAtivoPorContrato.set(row.id as string, false);
    }
  }

  for (const row of targets) {
    const encerrarOutro = deveEncerrarAtivoAnteriorNaSincronizacao({
      statusDestino: syncPayload.status,
      statusAtual: String(row.status ?? ""),
      permitirEncerrarAtivoAnterior: Boolean(
        opts?.permitirEncerrarAtivoAnterior
      ),
      cobrancaMensal,
    });
    const statusFinal = statusContratoAposSyncComAtivoExistente({
      statusDestino: syncPayload.status,
      statusAtual: String(row.status ?? ""),
      outroAtivoExiste: Boolean(outroAtivoPorContrato.get(row.id as string)),
      encerrarOutroAtivo: encerrarOutro,
    });
    const update: Record<string, unknown> = {
      status: statusFinal,
      contrato_enviado_em: syncPayload.contrato_enviado_em,
      contrato_assinado_em: syncPayload.contrato_assinado_em,
      boleto_vencimento: syncPayload.boleto_vencimento,
      boleto_pago: syncPayload.boleto_pago,
      boleto_pago_em: syncPayload.boleto_pago_em,
      liberado_para_agendamento: syncPayload.liberado_para_agendamento,
      updated_at: new Date().toISOString(),
    };

    if (syncPayload.tipo_contrato === "mensal") {
      update.tipo_contrato = "mensal";
    }

    // Preserva vigência já definida. Não troca o início pela data de aprovação ou do PDF.
    const temVigencia =
      Boolean(String(row.data_inicio ?? "").trim()) &&
      Boolean(String(row.data_fim ?? "").trim());
    if (!temVigencia) {
      if (syncPayload.data_inicio) update.data_inicio = syncPayload.data_inicio;
      if (syncPayload.data_fim) update.data_fim = syncPayload.data_fim;
      if (syncPayload.tipo_contrato && update.tipo_contrato == null) {
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

  const { data: statusDepois, error: statusDepoisError } = await supabase
    .from("orcamentos")
    .select("status")
    .eq("id", orcamentoId)
    .maybeSingle();
  if (statusDepoisError) throw statusDepoisError;
  if (
    statusDepois?.status !== "aprovado" ||
    aprovacao.revertida_em
  ) {
    throw new Error(APROVACAO_NAO_PERSISTIDA_MSG);
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

  const { data: cicloRaw, error: cicloError } = await supabase
    .from("orcamento_aprovacoes")
    .select("revertida_em")
    .eq("id", aprovacaoId)
    .maybeSingle();
  if (cicloError) throw cicloError;
  if (cicloRaw?.revertida_em) {
    throw new Error(APROVACAO_REVERTIDA_NAO_VIGENTE_MSG);
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
  await syncClienteContratoFromAprovacao(aprovacao, {
    permitirEncerrarAtivoAnterior: true,
  });
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
  await syncClienteContratoFromAprovacao(aprovacao, {
    permitirEncerrarAtivoAnterior: false,
  });
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
