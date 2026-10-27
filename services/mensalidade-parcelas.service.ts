import { createClient } from "@/lib/supabase/client";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import {
  MENSALIDADE_PARCELAS_MIGRATION_MSG,
  planejarPersistenciaParcelas,
  type ParcelaMensalidadeRegistrada,
} from "@/lib/mensalidade-parcelas";

const APROVACAO_SELECT = "*, orcamento_aprovacao_itens (*)";

type ParcelaRow = {
  id: string;
  aprovacao_id: string;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  numero: number;
  vencimento: string;
  valor: number | string;
  pago_em: string | null;
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
  };
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
  let { data, error } = await supabase
    .from("orcamento_mensalidade_parcelas")
    .select(
      "id, aprovacao_id, vigencia_inicio, vigencia_fim, numero, vencimento, valor, pago_em"
    )
    .eq("aprovacao_id", aprovacaoId)
    .is("sem_vigencia_em", null)
    .order("vigencia_inicio", { ascending: true })
    .order("numero", { ascending: true });
  if (error && /sem_vigencia_em|schema cache|42703/i.test(error.message ?? "")) {
    ({ data, error } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .select(
        "id, aprovacao_id, vigencia_inicio, vigencia_fim, numero, vencimento, valor, pago_em"
      )
      .eq("aprovacao_id", aprovacaoId)
      .order("vigencia_inicio", { ascending: true })
      .order("numero", { ascending: true }));
  }
  if (error) throw erroParcelas(error);
  return ((data ?? []) as ParcelaRow[]).map(mapRow);
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
    const { error } = await supabase
      .from("orcamento_mensalidade_parcelas")
      .update({
        pago_em: item.pagoEmIso,
        updated_at: agora,
      })
      .eq("aprovacao_id", params.aprovacaoId)
      .eq("vigencia_inicio", inicio)
      .eq("numero", item.numero)
      .is("sem_vigencia_em", null);
    if (error && /sem_vigencia_em|schema cache|42703/i.test(error.message ?? "")) {
      const retry = await supabase
        .from("orcamento_mensalidade_parcelas")
        .update({
          pago_em: item.pagoEmIso,
          updated_at: agora,
        })
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
