import { createClient } from "@/lib/supabase/client";
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
  return data as ClienteContratoRecord;
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
