import { createClient } from "@/lib/supabase/client";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import { buscarAprovacaoPorOrcamentoId } from "@/services/orcamento-aprovacao.service";

export type ParcelaPreviaAlteracao = {
  id: string;
  numero: number;
  vencimento: string;
  valorAnterior?: number;
  valorNovo?: number;
  valor?: number;
  motivo?: string | null;
};

export type PreviaAlteracaoContratacao = {
  token: string;
  orcamentoId: string;
  numeroOrcamento: string;
  cliente: string;
  contratoId: string | null;
  numeroContrato: string | null;
  quantidadeAnterior: number;
  quantidadeNova: number;
  valorAnterior: number;
  valorNovo: number;
  valorSugerido: number;
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  efeitoNumero: number;
  efeitoVencimento: string | null;
  contratoAssinado: boolean;
  contratoSituacao: "nova_versao" | "aditivo_pendente";
  parcelasAtualizar: ParcelaPreviaAlteracao[];
  parcelasPreservar: ParcelaPreviaAlteracao[];
  ajustes: Array<{ numero: number; valor: number; mensagem: string }>;
  providencias: string[];
  vagasNovas: number;
  impedimentos: string[];
  motivo: string | null;
};

export type AditivoContratacaoPendente = {
  id: string;
  quantidade_anterior: number;
  quantidade_nova: number;
  valor_anterior: number;
  valor_novo: number;
  efeito_vigencia_inicio: string;
  efeito_numero: number;
  efeito_vencimento: string;
  motivo: string;
  status: string;
  criado_em: string;
};

function numero(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function lista(value: unknown): ParcelaPreviaAlteracao[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      id: String(row.id ?? ""),
      numero: numero(row.numero),
      vencimento: String(row.vencimento ?? "").slice(0, 10),
      valorAnterior:
        row.valor_anterior == null ? undefined : numero(row.valor_anterior),
      valorNovo: row.valor_novo == null ? undefined : numero(row.valor_novo),
      valor: row.valor == null ? undefined : numero(row.valor),
      motivo: row.motivo == null ? null : String(row.motivo),
    };
  });
}

function mapPrevia(raw: Record<string, unknown>): PreviaAlteracaoContratacao {
  const situacao = raw.contrato_situacao === "aditivo_pendente"
    ? "aditivo_pendente"
    : "nova_versao";
  return {
    token: String(raw.token ?? ""),
    orcamentoId: String(raw.orcamento_id ?? ""),
    numeroOrcamento: String(raw.numero_orcamento ?? ""),
    cliente: String(raw.cliente ?? ""),
    contratoId: raw.contrato_id ? String(raw.contrato_id) : null,
    numeroContrato: raw.numero_contrato ? String(raw.numero_contrato) : null,
    quantidadeAnterior: numero(raw.quantidade_anterior),
    quantidadeNova: numero(raw.quantidade_nova),
    valorAnterior: numero(raw.valor_anterior),
    valorNovo: numero(raw.valor_novo),
    valorSugerido: numero(raw.valor_sugerido),
    vigenciaInicio: raw.vigencia_inicio ? String(raw.vigencia_inicio).slice(0, 10) : null,
    vigenciaFim: raw.vigencia_fim ? String(raw.vigencia_fim).slice(0, 10) : null,
    efeitoNumero: numero(raw.efeito_numero),
    efeitoVencimento: raw.efeito_vencimento
      ? String(raw.efeito_vencimento).slice(0, 10)
      : null,
    contratoAssinado: raw.contrato_assinado === true,
    contratoSituacao: situacao,
    parcelasAtualizar: lista(raw.parcelas_atualizar),
    parcelasPreservar: lista(raw.parcelas_preservar),
    ajustes: Array.isArray(raw.ajustes)
      ? raw.ajustes.map((item) => {
          const row = item as Record<string, unknown>;
          return {
            numero: numero(row.numero),
            valor: numero(row.valor),
            mensagem: String(row.mensagem ?? ""),
          };
        })
      : [],
    providencias: Array.isArray(raw.providencias)
      ? raw.providencias.map((item) => String(item))
      : [],
    vagasNovas: numero(raw.vagas_novas),
    impedimentos: Array.isArray(raw.impedimentos)
      ? raw.impedimentos.map((item) => String(item))
      : [],
    motivo: raw.motivo == null ? null : String(raw.motivo),
  };
}

function erroRpc(error: { message?: string } | null, fallback: string): Error {
  const message = error?.message ?? "";
  if (/preparar_nova_versao_contrato_contratacao/i.test(message)) {
    return new Error(
      "A nova versão do contrato ainda não está disponível no banco. Execute a migration 158_nova_versao_contrato_alteracao.sql."
    );
  }
  if (/prever_alteracao_contratacao_mensalidade|aplicar_alteracao_contratacao_mensalidade|schema cache|PGRST202/i.test(message)) {
    return new Error(
      "A alteração de contratação ainda não está disponível no banco. Execute a migration 157_alterar_contratacao_mensalidade.sql."
    );
  }
  return new Error(message || fallback);
}

export async function preverAlteracaoContratacao(params: {
  aprovacaoId: string;
  quantidade: number;
  valorMensal: number;
  numeroInicio: number;
  motivo: string;
}): Promise<PreviaAlteracaoContratacao> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "prever_alteracao_contratacao_mensalidade",
    {
      p_aprovacao_id: params.aprovacaoId,
      p_quantidade: params.quantidade,
      p_valor_mensal: params.valorMensal,
      p_numero_inicio: params.numeroInicio,
      p_motivo: params.motivo,
    }
  );
  if (error) throw erroRpc(error, "Não foi possível montar a prévia.");
  return mapPrevia((data ?? {}) as Record<string, unknown>);
}

export async function aplicarAlteracaoContratacao(params: {
  aprovacaoId: string;
  orcamentoId: string;
  quantidade: number;
  valorMensal: number;
  numeroInicio: number;
  motivo: string;
  token: string;
  idempotencia: string;
}): Promise<{
  previa: PreviaAlteracaoContratacao;
  aprovacao: OrcamentoAprovacaoRecord;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc(
    "aplicar_alteracao_contratacao_mensalidade",
    {
      p_aprovacao_id: params.aprovacaoId,
      p_quantidade: params.quantidade,
      p_valor_mensal: params.valorMensal,
      p_numero_inicio: params.numeroInicio,
      p_motivo: params.motivo,
      p_token: params.token,
      p_idempotencia: params.idempotencia,
    }
  );
  if (error) throw erroRpc(error, "Não foi possível alterar a contratação.");
  const aprovacao = await buscarAprovacaoPorOrcamentoId(params.orcamentoId);
  if (!aprovacao) {
    throw new Error("A alteração foi gravada, mas a aprovação não pôde ser recarregada.");
  }
  return {
    previa: mapPrevia((data ?? {}) as Record<string, unknown>),
    aprovacao,
  };
}

export async function existeAlteracaoContratacao(
  aprovacaoId: string
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_contratacao_alteracoes")
    .select("id")
    .eq("aprovacao_id", aprovacaoId)
    .limit(1);
  if (error) {
    if (/orcamento_contratacao_alteracoes|schema cache|PGRST205|42P01/i.test(error.message ?? "")) {
      return false;
    }
    throw error;
  }
  return (data?.length ?? 0) > 0;
}

export async function prepararNovaVersaoContrato(params: {
  aprovacaoId: string;
  orcamentoId: string;
}): Promise<OrcamentoAprovacaoRecord> {
  const supabase = createClient();
  const { error } = await supabase.rpc(
    "preparar_nova_versao_contrato_contratacao",
    { p_aprovacao_id: params.aprovacaoId }
  );
  if (error) throw erroRpc(error, "Não foi possível preparar a nova versão do contrato.");
  const aprovacao = await buscarAprovacaoPorOrcamentoId(params.orcamentoId);
  if (!aprovacao) {
    throw new Error(
      "A nova versão foi preparada, mas a aprovação não pôde ser recarregada."
    );
  }
  return aprovacao;
}

export async function listarAditivosContratacaoPendentes(
  aprovacaoId: string
): Promise<AditivoContratacaoPendente[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamento_contratacao_aditivos")
    .select(
      "id, quantidade_anterior, quantidade_nova, valor_anterior, valor_novo, efeito_vigencia_inicio, efeito_numero, efeito_vencimento, motivo, status, criado_em"
    )
    .eq("aprovacao_id", aprovacaoId)
    .order("criado_em", { ascending: false });
  if (error) {
    if (/orcamento_contratacao_aditivos|schema cache|PGRST205|42P01/i.test(error.message ?? "")) {
      return [];
    }
    throw error;
  }
  return (data ?? []) as AditivoContratacaoPendente[];
}
