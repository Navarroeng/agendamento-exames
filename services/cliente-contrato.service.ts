import type { ClienteContratoConsulta } from "@/lib/cliente-contrato-atual";
import { createClient } from "@/lib/supabase/client";
import type { ParcelaMensalidadeRegistrada } from "@/lib/mensalidade-parcelas";
import type {
  ClienteContratoInsert,
  ClienteContratoRecord,
  ClienteContratoStatus,
} from "@/lib/types";
import { assertPodeEncerrarContrato } from "@/services/contrato-permissoes.service";

export async function listarTodosContratos(
  limit = 1000
): Promise<ClienteContratoRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .order("data_fim", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ClienteContratoRecord[];
}

export async function listarContratosPorCliente(
  clienteId: string
): Promise<ClienteContratoRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("aprovado_em", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("data_inicio", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ClienteContratoRecord[];
}

function isoData(value: string | null | undefined): string | null {
  const texto = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

/**
 * Anexa modalidade, forma de pagamento e parcelas da mesma contratação.
 * Não cria outra linha de contrato e não altera o registro antigo.
 */
export async function complementarContratosComCobranca(
  contratos: ClienteContratoRecord[]
): Promise<ClienteContratoConsulta[]> {
  const orcamentoIds = Array.from(
    new Set(
      contratos
        .map((contrato) => contrato.orcamento_id?.trim())
        .filter((id): id is string => Boolean(id))
    )
  );
  if (orcamentoIds.length === 0) return contratos;

  const supabase = createClient();
  const [orcamentosRes, aprovacoesRes] = await Promise.all([
    supabase.from("orcamentos").select("id, modalidade").in("id", orcamentoIds),
    supabase
      .from("orcamento_aprovacoes")
      .select(
        "id, orcamento_id, contrato_assinado, mensalidade_pagamento, mensalidade_dia_vencimento, mensalidade_valor_mensal"
      )
      .in("orcamento_id", orcamentoIds),
  ]);
  if (orcamentosRes.error) throw orcamentosRes.error;
  if (aprovacoesRes.error) throw aprovacoesRes.error;

  const modalidadePorOrcamento = new Map<string, string | null>();
  for (const row of orcamentosRes.data ?? []) {
    modalidadePorOrcamento.set(
      String(row.id),
      (row.modalidade as string | null) ?? null
    );
  }

  type AprovacaoCobranca = {
    id: string;
    orcamento_id: string;
    contrato_assinado: boolean | null;
    mensalidade_pagamento: string | null;
    mensalidade_dia_vencimento: number | null;
    mensalidade_valor_mensal: number | null;
  };
  const aprovacaoPorOrcamento = new Map<string, AprovacaoCobranca>();
  for (const row of (aprovacoesRes.data ?? []) as AprovacaoCobranca[]) {
    aprovacaoPorOrcamento.set(row.orcamento_id, row);
  }

  const aprovacaoIds = Array.from(aprovacaoPorOrcamento.values()).map(
    (row) => row.id
  );
  const parcelasPorAprovacao = new Map<string, ParcelaMensalidadeRegistrada[]>();
  if (aprovacaoIds.length > 0) {
    const parcelasRes = await supabase
      .from("orcamento_mensalidade_parcelas")
      .select(
        "aprovacao_id, vigencia_inicio, vigencia_fim, numero, vencimento, valor, pago_em"
      )
      .in("aprovacao_id", aprovacaoIds);
    if (
      parcelasRes.error &&
      parcelasRes.error.code !== "42P01" &&
      parcelasRes.error.code !== "PGRST205"
    ) {
      throw parcelasRes.error;
    }
    for (const row of parcelasRes.data ?? []) {
      const aprovacaoId = String(row.aprovacao_id);
      const lista = parcelasPorAprovacao.get(aprovacaoId) ?? [];
      lista.push({
        vigenciaInicio: isoData(String(row.vigencia_inicio ?? "")) ?? "",
        vigenciaFim: isoData(
          row.vigencia_fim == null ? null : String(row.vigencia_fim)
        ),
        numero: Number(row.numero),
        vencimentoIso: isoData(String(row.vencimento ?? "")) ?? "",
        valor: Number(row.valor),
        pagoEmIso: isoData(row.pago_em == null ? null : String(row.pago_em)),
      });
      parcelasPorAprovacao.set(aprovacaoId, lista);
    }
  }

  return contratos.map((contrato) => {
    const orcamentoId = contrato.orcamento_id?.trim();
    if (!orcamentoId) return contrato;
    const aprovacao = aprovacaoPorOrcamento.get(orcamentoId);
    return {
      ...contrato,
      modalidadeOrcamento: modalidadePorOrcamento.get(orcamentoId) ?? null,
      contrato_assinado: aprovacao?.contrato_assinado ?? null,
      mensalidadePagamento: aprovacao?.mensalidade_pagamento ?? null,
      mensalidadeDiaVencimento: aprovacao?.mensalidade_dia_vencimento ?? null,
      parcelasMensalidade: aprovacao
        ? (parcelasPorAprovacao.get(aprovacao.id) ?? [])
        : [],
    };
  });
}

export async function buscarContratoAtivo(
  clienteId: string
): Promise<ClienteContratoRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("status", "ativo")
    .maybeSingle();

  if (error) throw error;
  return (data as ClienteContratoRecord | null) ?? null;
}

async function encerrarContratosAtivos(
  clienteId: string,
  dataFim: string,
  excludeId?: string
): Promise<void> {
  const supabase = createClient();

  let query = supabase
    .from("cliente_contratos")
    .update({
      status: "encerrado" satisfies ClienteContratoStatus,
      data_fim: dataFim,
    })
    .eq("cliente_id", clienteId)
    .eq("status", "ativo");

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function criarContrato(
  payload: ClienteContratoInsert
): Promise<ClienteContratoRecord> {
  const supabase = createClient();

  if (payload.status === "ativo") {
    await encerrarContratosAtivos(payload.cliente_id, payload.data_inicio);
  }

  const { data, error } = await supabase
    .from("cliente_contratos")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as ClienteContratoRecord;
}

export async function atualizarContrato(
  id: string,
  payload: Omit<ClienteContratoInsert, "cliente_id">
): Promise<ClienteContratoRecord> {
  const supabase = createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("cliente_contratos")
    .select("cliente_id, status")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  if (payload.status === "ativo" && existing.status !== "ativo") {
    await encerrarContratosAtivos(
      existing.cliente_id as string,
      payload.data_inicio,
      id
    );
  }

  const { data, error } = await supabase
    .from("cliente_contratos")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as ClienteContratoRecord;
}

export async function encerrarContrato(
  id: string,
  opts?: {
    dataFim?: string;
    motivo?: string;
    encerradoPor?: string;
    /** Se true, sobrescreve data_fim (legado). Default: preserva vigência prevista. */
    alterarDataFim?: boolean;
  }
): Promise<ClienteContratoRecord> {
  await assertPodeEncerrarContrato();

  const supabase = createClient();
  const agora = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: "encerrado" satisfies ClienteContratoStatus,
    encerrado_em: agora,
    liberado_para_agendamento: false,
  };
  if (opts?.encerradoPor?.trim()) {
    update.encerrado_por = opts.encerradoPor.trim();
  }
  if (opts?.motivo?.trim()) {
    update.motivo_encerramento = opts.motivo.trim();
  }
  if (opts?.alterarDataFim && opts.dataFim) {
    update.data_fim = opts.dataFim;
  }

  const { data, error } = await supabase
    .from("cliente_contratos")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  const record = data as ClienteContratoRecord;

  const { error: recomputeError } = await supabase.rpc(
    "recompute_cliente_disponivel_agendamento",
    { p_cliente_id: record.cliente_id }
  );
  if (recomputeError) {
    console.warn(
      "recompute disponibilidade após encerrar contrato:",
      recomputeError.message
    );
  }

  return record;
}

export async function buscarContratoPorOrcamentoId(
  orcamentoId: string
): Promise<ClienteContratoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ClienteContratoRecord | null) ?? null;
}
