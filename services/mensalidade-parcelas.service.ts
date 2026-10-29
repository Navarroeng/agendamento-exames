import { createClient } from "@/lib/supabase/client";
import {
  BAIXA_EM_ANDAMENTO_MSG,
  BAIXA_JA_PAGA_MSG,
  MENSALIDADE_BAIXA_COLUNAS_MSG,
  parcelaEntraEmCobrancas,
  validarBaixaParcela,
} from "@/lib/cobrancas-mensalidades";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import {
  MENSALIDADE_PARCELAS_MIGRATION_MSG,
  payloadAtualizacaoPagoEm,
  planejarPersistenciaParcelas,
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
}): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_aprovacoes")
    .update({
      observacao_pagamento: params.observacao,
      financeiro_salvo_em: new Date().toISOString(),
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
  });
}

export async function salvarObservacaoMensalidades(params: {
  aprovacaoId: string;
  observacao: string | null;
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

/**
 * Quita uma parcela já existente.
 * Grava pago_em, valor recebido e comprovante na mesma linha do Financeiro.
 * Se as colunas da baixa não existirem, não grava pagamento algum.
 * Não cria parcela, não mexe em vencimento, valor, boleto, auditoria nem etapa.
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
    const row = await lerParcelaParaBaixa(params.parcelaId);
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
        .eq("id", params.parcelaId)
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
      id: params.parcelaId,
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
