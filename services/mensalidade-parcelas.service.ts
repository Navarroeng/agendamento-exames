import { createClient } from "@/lib/supabase/client";
import {
  BAIXA_EM_ANDAMENTO_MSG,
  BAIXA_JA_PAGA_MSG,
  MENSALIDADE_BAIXA_COLUNAS_MSG,
  decidirPersistenciaParcelaCalculada,
  escolherVigenciaFinanceiro,
  lerIdParcelaGradeCobranca,
  parcelaEntraEmCobrancas,
  validarBaixaParcela,
  type FonteGradeCobranca,
} from "@/lib/cobrancas-mensalidades";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { GravacaoSolicitacaoEmissaoBoletos } from "@/lib/boletos-emissao-solicitacao";
import {
  MENSALIDADE_PARCELAS_MIGRATION_MSG,
  payloadAtualizacaoPagoEm,
  parcelasParaInserirDaGrade,
  planejarPersistenciaParcelas,
  type EfeitoValorMensalidade,
  type ParcelaMensalidadeRegistrada,
} from "@/lib/mensalidade-parcelas";
import {
  deleteOrcamentoComprovantePagamento,
  uploadOrcamentoComprovantePagamento,
} from "@/services/orcamento-comprovante.service";

const APROVACAO_SELECT = "*, orcamento_aprovacao_itens (*)";

const SELECT_PARCELA_LEGADO =
  "id, aprovacao_id, vigencia_inicio, vigencia_fim, numero, vencimento, valor, pago_em";

const SELECT_PARCELA_COMPLETO = `${SELECT_PARCELA_LEGADO}, valor_recebido, comprovante_path, comprovante_nome`;

type ParcelaRow = {
  id: string;
  aprovacao_id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  numero: number;
  vencimento: string;
  valor: number | string;
  pago_em: string | null;
  valor_recebido?: number | string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
};

function iso(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function mapRow(row: ParcelaRow): ParcelaMensalidadeRegistrada & { id: string } {
  return {
    id: row.id,
    vigenciaInicio: iso(row.vigencia_inicio) ?? "",
    vigenciaFim: iso(row.vigencia_fim),
    numero: Number(row.numero),
    vencimentoIso: iso(row.vencimento) ?? "",
    valor: Number(row.valor),
    pagoEmIso: iso(row.pago_em),
    valorRecebido:
      row.valor_recebido == null || row.valor_recebido === ""
        ? null
        : Number(row.valor_recebido),
    comprovantePath: row.comprovante_path?.trim() || null,
    comprovanteNome: row.comprovante_nome?.trim() || null,
  };
}

function colunaAusente(error: { message?: string; code?: string }): boolean {
  const message = error.message ?? "";
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /schema cache|sem_vigencia_em|valor_recebido|comprovante_/i.test(message)
  );
}

function erroParcelas(error: { message?: string; code?: string }): Error {
  const message = error.message ?? "";
  if (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /orcamento_mensalidade_parcelas/i.test(message)
  ) {
    return new Error(MENSALIDADE_PARCELAS_MIGRATION_MSG);
  }
  return new Error(message || "Não foi possível salvar as mensalidades.");
}

export async function listarParcelasMensalidade(
  aprovacaoId: string
): Promise<ParcelaMensalidadeRegistrada[]> {
  const supabase = createClient();
  let query = supabase
    .from("orcamento_mensalidade_parcelas")
    .select(SELECT_PARCELA_COMPLETO)
    .eq("aprovacao_id", aprovacaoId)
    .order("vigencia_inicio", { ascending: true })
    .order("numero", { ascending: true })
    .is("sem_vigencia_em", null);
  let { data, error } = await query;
  if (error && /sem_vigencia_em/i.test(error.message ?? "")) {
    ({ data, error } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .select(SELECT_PARCELA_COMPLETO)
      .eq("aprovacao_id", aprovacaoId)
      .order("vigencia_inicio", { ascending: true })
      .order("numero", { ascending: true }));
  }
  if (error && colunaAusente(error)) {
    throw new Error(MENSALIDADE_BAIXA_COLUNAS_MSG);
  }
  if (error) throw erroParcelas(error);
  return ((data ?? []) as unknown as ParcelaRow[]).map(mapRow);
}

async function salvarObservacao(params: {
  aprovacaoId: string;
  observacao: string | null;
  solicitacao?: GravacaoSolicitacaoEmissaoBoletos;
}): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      observacao_pagamento: params.observacao,
      financeiro_salvo_em: new Date().toISOString(),
      ...(params.solicitacao
        ? {
            boletos_emissao_solicitada:
              params.solicitacao.boletos_emissao_solicitada,
            boletos_emissao_solicitada_em:
              params.solicitacao.boletos_emissao_solicitada_em,
          }
        : {}),
    })
    .eq("id", params.aprovacaoId)
    .select(APROVACAO_SELECT)
    .single();
  if (error) throw error;
  return data as OrcamentoAprovacaoRecord;
}

/**
 * Grava as parcelas da vigência e a observação.
 * Não altera vencimento nem valor já registrados, não mexe em boleto_pago
 * e não marca recebimento sem data informada.
 * Ao apagar a data, limpa valor recebido e a referência do comprovante.
 * Não apaga auditoria nem o arquivo já enviado.
 */
export async function salvarControleMensalidades(params: {
  aprovacaoId: string;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  parcelas: Array<{
    numero: number;
    vencimentoIso: string;
    valor: number;
    pagoEmIso: string | null;
  }>;
  observacao: string | null;
  solicitacao?: GravacaoSolicitacaoEmissaoBoletos;
}): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const inicio = iso(params.vigenciaInicio);
  if (!inicio) {
    throw new Error("Informe o início da vigência antes de salvar as parcelas.");
  }

  let { data: existentesRaw, error: listError } = await supabase
    .from("orcamento_mensalidade_parcelas")
    .select(
      "id, aprovacao_id, vigencia_inicio, vigencia_fim, numero, vencimento, valor, pago_em"
    )
    .eq("aprovacao_id", params.aprovacaoId)
    .eq("vigencia_inicio", inicio)
    .is("sem_vigencia_em", null);
  if (
    listError &&
    /sem_vigencia_em|schema cache|42703/i.test(listError.message ?? "")
  ) {
    ({ data: existentesRaw, error: listError } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .select(
        "id, aprovacao_id, vigencia_inicio, vigencia_fim, numero, vencimento, valor, pago_em"
      )
      .eq("aprovacao_id", params.aprovacaoId)
      .eq("vigencia_inicio", inicio));
  }
  if (listError) throw erroParcelas(listError);

  const existentes = ((existentesRaw ?? []) as ParcelaRow[]).map(mapRow);
  const plano = planejarPersistenciaParcelas({
    existentes,
    desejadas: params.parcelas,
  });
  const agora = new Date().toISOString();

  if (plano.inserir.length > 0) {
    const { error } = await supabase.from("orcamento_mensalidade_parcelas").insert(
      plano.inserir.map((item) => ({
        aprovacao_id: params.aprovacaoId,
        vigencia_inicio: inicio,
        vigencia_fim: iso(params.vigenciaFim),
        numero: item.numero,
        vencimento: item.vencimentoIso,
        valor: item.valor,
        pago_em: iso(item.pagoEmIso),
        updated_at: agora,
      }))
    );
    if (error) throw erroParcelas(error);
  }

  for (const item of plano.atualizarPagoEm) {
    const payload = {
      ...payloadAtualizacaoPagoEm(item.pagoEmIso),
      updated_at: agora,
    };
    const { error } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .update(payload)
      .eq("aprovacao_id", params.aprovacaoId)
      .eq("vigencia_inicio", inicio)
      .eq("numero", item.numero)
      .is("sem_vigencia_em", null);
    if (error && /sem_vigencia_em/i.test(error.message ?? "")) {
      const retry = await supabase
        .from("orcamento_mensalidade_parcelas")
        .update(payload)
        .eq("aprovacao_id", params.aprovacaoId)
        .eq("vigencia_inicio", inicio)
        .eq("numero", item.numero);
      if (retry.error) throw erroParcelas(retry.error);
    } else if (error) {
      throw erroParcelas(error);
    }
  }

  return salvarObservacao({
    aprovacaoId: params.aprovacaoId,
    observacao: params.observacao,
    solicitacao: params.solicitacao,
  });
}

/**
 * Grava só as parcelas da grade que ainda não existem nesta vigência.
 * Não altera vencimento, valor nem pagamento das que já foram salvas.
 */
export async function inserirParcelasMensalidadeAusentes(params: {
  aprovacaoId: string;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  dia: number | null;
  vencimentoRegra: string | null;
  valorMensal: number | null;
  valorFinal: number | null;
  efeito?: EfeitoValorMensalidade | null;
}): Promise<number> {
  const inicio = iso(params.vigenciaInicio);
  const fim = iso(params.vigenciaFim);
  if (!inicio) return 0;
  const registradas = await listarParcelasMensalidade(params.aprovacaoId);
  const inserir = parcelasParaInserirDaGrade({
    vigenciaInicio: inicio,
    vigenciaFim: fim,
    dia: params.dia,
    vencimentoRegra: params.vencimentoRegra,
    valorMensal: params.valorMensal,
    valorFinal: params.valorFinal,
    registradas,
    efeito: params.efeito,
  });
  if (inserir.length === 0) return 0;

  const supabase = createClient();
  const agora = new Date().toISOString();
  let gravadas = 0;
  for (const item of inserir) {
    const { error } = await supabase.from("orcamento_mensalidade_parcelas").insert({
      aprovacao_id: params.aprovacaoId,
      vigencia_inicio: inicio,
      vigencia_fim: fim,
      numero: item.numero,
      vencimento: item.vencimentoIso,
      valor: item.valor,
      pago_em: null,
      updated_at: agora,
    });
    if (error?.code === "23505") continue;
    if (error) throw erroParcelas(error);
    gravadas += 1;
  }
  return gravadas;
}

export async function salvarObservacaoMensalidades(params: {
  aprovacaoId: string;
  observacao: string | null;
  solicitacao?: GravacaoSolicitacaoEmissaoBoletos;
}): Promise<OrcamentoAprovacaoRecord> {
  return salvarObservacao(params);
}

export type BaixaParcelaResultado = {
  id: string;
  pagoEmIso: string;
  valorRecebido: number;
  comprovantePath: string | null;
  comprovanteNome: string | null;
};

const baixasEmAndamento = new Set<string>();

type ModalidadeJoin = { modalidade: string | null };
type AprovacaoBaixaJoin = {
  mensalidade_pagamento: string | null;
  orcamentos: ModalidadeJoin | ModalidadeJoin[] | null;
};

type ParcelaBaixaRow = {
  id: string;
  aprovacao_id: string;
  valor: number | string;
  pago_em: string | null;
  sem_vigencia_em?: string | null;
  orcamento_aprovacoes: AprovacaoBaixaJoin | AprovacaoBaixaJoin[] | null;
};

function um<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const SELECT_BAIXA = `
  id,
  aprovacao_id,
  valor,
  pago_em,
  sem_vigencia_em,
  orcamento_aprovacoes!inner (
    mensalidade_pagamento,
    orcamentos!inner ( modalidade )
  )
`;

const SELECT_BAIXA_LEGADO = `
  id,
  aprovacao_id,
  valor,
  pago_em,
  orcamento_aprovacoes!inner (
    mensalidade_pagamento,
    orcamentos!inner ( modalidade )
  )
`;

async function lerParcelaParaBaixa(
  parcelaId: string
): Promise<ParcelaBaixaRow> {
  const supabase = createClient();
  let { data, error } = await supabase
    .from("orcamento_mensalidade_parcelas")
    .select(SELECT_BAIXA)
    .eq("id", parcelaId)
    .maybeSingle();
  if (error && colunaAusente(error)) {
    ({ data, error } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .select(SELECT_BAIXA_LEGADO)
      .eq("id", parcelaId)
      .maybeSingle());
  }
  if (error) throw erroParcelas(error);
  if (!data) throw new Error("Parcela não encontrada.");
  return data as unknown as ParcelaBaixaRow;
}

function numeroOuNulo(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const numero = Number(value);
  return Number.isFinite(numero) ? numero : null;
}

async function buscarIdParcelaVigente(params: {
  aprovacaoId: string;
  vigenciaInicio: string;
  numero: number;
}): Promise<string | null> {
  const supabase = createClient();
  let { data, error } = await supabase
    .from("orcamento_mensalidade_parcelas")
    .select("id")
    .eq("aprovacao_id", params.aprovacaoId)
    .eq("vigencia_inicio", params.vigenciaInicio)
    .eq("numero", params.numero)
    .is("sem_vigencia_em", null)
    .maybeSingle();
  if (error && /sem_vigencia_em/i.test(error.message ?? "")) {
    ({ data, error } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .select("id")
      .eq("aprovacao_id", params.aprovacaoId)
      .eq("vigencia_inicio", params.vigenciaInicio)
      .eq("numero", params.numero)
      .maybeSingle());
  }
  if (error) throw erroParcelas(error);
  const id = String(data?.id ?? "").trim();
  return id || null;
}

async function fonteGradeDaAprovacao(
  aprovacaoId: string
): Promise<FonteGradeCobranca | null> {
  const supabase = createClient();
  const selectComRegra = `
    id,
    mensalidade_pagamento,
    mensalidade_dia_vencimento,
    mensalidade_vencimento_regra,
    mensalidade_valor_mensal,
    valor_final,
    revertida_em,
    orcamentos!inner (
      id,
      numero,
      cliente_nome,
      cliente_cnpj,
      modalidade,
      status,
      cliente_contratos (
        numero,
        status,
        data_inicio,
        data_fim,
        created_at
      )
    )
  `;
  let selectUsado = selectComRegra;
  let { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .select(selectUsado)
    .eq("id", aprovacaoId)
    .maybeSingle();
  if (
    error &&
    /mensalidade_vencimento_regra|schema cache|42703/i.test(error.message ?? "")
  ) {
    selectUsado = selectUsado.replace(/\n\s*mensalidade_vencimento_regra,/, "");
    ({ data, error } = await supabase
      .from("orcamento_aprovacoes")
      .select(selectUsado)
      .eq("id", aprovacaoId)
      .maybeSingle());
  }
  if (error && /revertida_em/i.test(error.message ?? "")) {
    selectUsado = selectUsado.replace(/\n\s*revertida_em,/, "");
    ({ data, error } = await supabase
      .from("orcamento_aprovacoes")
      .select(selectUsado)
      .eq("id", aprovacaoId)
      .maybeSingle());
  }
  if (error) throw erroParcelas(error);
  const row = data as {
    id: string;
    mensalidade_pagamento: string | null;
    mensalidade_dia_vencimento: number | null;
    mensalidade_vencimento_regra?: string | null;
    mensalidade_valor_mensal: number | string | null;
    valor_final: number | string | null;
    revertida_em?: string | null;
    orcamentos: {
      id: string;
      numero: string;
      cliente_nome: string;
      cliente_cnpj: string | null;
      modalidade: string | null;
      status: string;
      cliente_contratos:
        | {
            numero?: string | null;
            status?: string | null;
            data_inicio?: string | null;
            data_fim?: string | null;
            created_at?: string | null;
          }
        | Array<{
            numero?: string | null;
            status?: string | null;
            data_inicio?: string | null;
            data_fim?: string | null;
            created_at?: string | null;
          }>
        | null;
    } | null;
  } | null;
  if (!row || row.revertida_em) return null;
  const orcamento = um(row.orcamentos);
  if (!orcamento) return null;
  const contratos =
    orcamento.cliente_contratos == null
      ? []
      : Array.isArray(orcamento.cliente_contratos)
        ? orcamento.cliente_contratos
        : [orcamento.cliente_contratos];
  const vigencia = escolherVigenciaFinanceiro(contratos);
  if (!vigencia) return null;
  return {
    aprovacaoId: row.id,
    orcamentoId: orcamento.id,
    numeroOrcamento: orcamento.numero,
    numeroContrato: vigencia.numero,
    empresa: orcamento.cliente_nome,
    cnpj: orcamento.cliente_cnpj,
    statusOrcamento: orcamento.status,
    modalidade: orcamento.modalidade,
    mensalidadePagamento: row.mensalidade_pagamento,
    vigenciaInicio: vigencia.inicio,
    vigenciaFim: vigencia.fim,
    dia: row.mensalidade_dia_vencimento,
    vencimentoRegra: row.mensalidade_vencimento_regra ?? null,
    valorMensal: numeroOuNulo(row.mensalidade_valor_mensal),
    valorFinal: numeroOuNulo(row.valor_final),
    registradas: await listarParcelasMensalidade(row.id),
  };
}

/**
 * Parcela calculada ainda não está na tabela.
 * Grava só essa linha, sem pagamento. Se outra baixa já a criou, reutiliza o id.
 */
async function idPersistidoParaBaixa(parcelaId: string): Promise<string> {
  if (!lerIdParcelaGradeCobranca(parcelaId)) return parcelaId;
  const fonte = await fonteGradeDaAprovacao(
    lerIdParcelaGradeCobranca(parcelaId)?.aprovacaoId ?? ""
  );
  if (!fonte) throw new Error("Parcela não encontrada.");
  const decisao = decidirPersistenciaParcelaCalculada({ id: parcelaId, fonte });
  if (decisao.acao === "recusar") throw new Error("Parcela não encontrada.");
  if (decisao.acao === "ja_gravada") {
    const existente = await buscarIdParcelaVigente(decisao);
    if (!existente) throw new Error("Parcela não encontrada.");
    return existente;
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_mensalidade_parcelas")
    .insert({
      aprovacao_id: decisao.aprovacaoId,
      vigencia_inicio: decisao.vigenciaInicio,
      vigencia_fim: iso(decisao.vigenciaFim),
      numero: decisao.numero,
      vencimento: decisao.vencimentoIso,
      valor: decisao.valor,
      pago_em: null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
  if (error?.code === "23505") {
    const existente = await buscarIdParcelaVigente(decisao);
    if (!existente) throw new Error("Parcela não encontrada.");
    return existente;
  }
  if (error) throw erroParcelas(error);
  const id = String(data?.id ?? "").trim();
  if (!id) throw new Error("Parcela não encontrada.");
  return id;
}

/**
 * Quita a parcela na mesma linha do Financeiro.
 * Se ela ainda era só calculada, grava essa linha e em seguida o pagamento.
 * Não altera vencimento nem valor já registrados e não quita de novo.
 * Se as colunas da baixa não existirem, não grava pagamento algum.
 */
export async function registrarBaixaParcelaMensalidade(params: {
  parcelaId: string;
  pagoEmIso: string;
  valorRecebido: number;
  comprovante: File | null;
}): Promise<BaixaParcelaResultado> {
  if (baixasEmAndamento.has(params.parcelaId)) {
    throw new Error(BAIXA_EM_ANDAMENTO_MSG);
  }
  baixasEmAndamento.add(params.parcelaId);
  let uploaded: {
    path: string;
    nome: string;
    tipo: string;
    tamanho: number;
  } | null = null;
  let confirmada = false;
  try {
    const parcelaId = await idPersistidoParaBaixa(params.parcelaId);
    const row = await lerParcelaParaBaixa(parcelaId);
    const aprovacao = um(row.orcamento_aprovacoes);
    const orcamento = um(aprovacao?.orcamentos);
    if (
      !parcelaEntraEmCobrancas({
        modalidade: orcamento?.modalidade,
        mensalidadePagamento: aprovacao?.mensalidade_pagamento,
        semVigencia: Boolean(row.sem_vigencia_em),
      })
    ) {
      throw new Error("Esta parcela não entra nas cobranças de Gestão SST.");
    }

    const validacao = validarBaixaParcela({
      pagoEmAtual: iso(row.pago_em),
      valorPrevisto: Number(row.valor),
      valorRecebido: params.valorRecebido,
      pagoEmIso: params.pagoEmIso,
    });
    if (!validacao.ok) throw new Error(validacao.mensagem);

    if (params.comprovante) {
      uploaded = await uploadOrcamentoComprovantePagamento(
        row.aprovacao_id,
        params.comprovante
      );
    }

    const supabase = createClient();
    const agora = new Date().toISOString();
    const payload = {
      pago_em: params.pagoEmIso,
      valor_recebido: params.valorRecebido,
      comprovante_path: uploaded?.path ?? null,
      comprovante_nome: uploaded?.nome ?? null,
      comprovante_tipo: uploaded?.tipo ?? null,
      comprovante_tamanho: uploaded?.tamanho ?? null,
      updated_at: agora,
    };

    const tentar = async (filtrarVigencia: boolean) => {
      let query = supabase
        .from("orcamento_mensalidade_parcelas")
        .update(payload)
        .eq("id", parcelaId)
        .is("pago_em", null);
      if (filtrarVigencia) query = query.is("sem_vigencia_em", null);
      return query.select("id, pago_em, valor_recebido, comprovante_path");
    };

    let resultado = await tentar(true);
    if (resultado.error && /sem_vigencia_em/i.test(resultado.error.message ?? "")) {
      resultado = await tentar(false);
    }
    if (
      resultado.error &&
      colunaAusente(resultado.error) &&
      /valor_recebido|comprovante_/i.test(resultado.error.message ?? "")
    ) {
      throw new Error(MENSALIDADE_BAIXA_COLUNAS_MSG);
    }
    if (resultado.error) throw erroParcelas(resultado.error);
    if (!resultado.data || resultado.data.length === 0) {
      throw new Error(BAIXA_JA_PAGA_MSG);
    }

    confirmada = true;
    return {
      id: parcelaId,
      pagoEmIso: params.pagoEmIso,
      valorRecebido: params.valorRecebido,
      comprovantePath: uploaded?.path ?? null,
      comprovanteNome: uploaded?.nome ?? null,
    };
  } catch (err) {
    if (uploaded && !confirmada) {
      try {
        await deleteOrcamentoComprovantePagamento(uploaded.path);
      } catch {
        /* A parcela não foi quitada. O arquivo pode permanecer no bucket. */
      }
    }
    throw err;
  } finally {
    baixasEmAndamento.delete(params.parcelaId);
  }
}
