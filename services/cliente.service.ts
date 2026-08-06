import { createClient } from "@/lib/supabase/client";
import { clienteRecordMatchesBusca } from "@/lib/cliente-busca";
import { buildCamposBloqueioManualAgendamento } from "@/lib/cliente-bloqueio-manual";
import {
  CLIENTE_DISPONIVEL_AGENDAMENTO_MSG,
  isClienteDisponivelAgendamento,
  matchesClienteAgendamentoFilter,
  type ClienteAgendamentoFilter,
} from "@/lib/cliente-disponivel-agendamento";
import {
  CLIENTE_CNPJ_DUPLICADO_MSG,
  normalizeCnpjDigits,
  resolveClienteCnpjError,
} from "@/lib/cliente-cnpj";
import {
  CLIENTE_DB_COLUMNS,
  CLIENTE_LIST_COLUMNS,
  CLIENTE_SELECT_COLUMNS,
} from "@/lib/cliente-schema";
import { sortByNome } from "@/lib/sort-by-label";
import type {
  ClienteComContratos,
  ClienteInsert,
  ClienteRecord,
  ClienteUpdate,
} from "@/lib/types";

const SELECT_BATCH_SIZE = 1000;

export interface ListarClientesPaginadosParams {
  page?: number;
  pageSize?: number;
  busca?: string;
  agendamento?: ClienteAgendamentoFilter;
}

export interface ListarClientesPaginadosResult {
  records: ClienteRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function throwClienteSaveError(error: unknown): never {
  const cnpjMessage = resolveClienteCnpjError(error);
  if (cnpjMessage) {
    throw new Error(cnpjMessage);
  }
  throw error;
}

async function assertCnpjClienteDisponivel(
  cnpj: string,
  excludeId?: string
): Promise<void> {
  const digits = normalizeCnpjDigits(cnpj);
  if (digits.length !== 14) return;

  const existente = await buscarClientePorCnpjDigits(digits);
  if (existente && existente.id !== excludeId) {
    throw new Error(CLIENTE_CNPJ_DUPLICADO_MSG);
  }
}

export async function buscarClientePorCnpjDigits(
  digits: string
): Promise<ClienteRecord | null> {
  const normalized = normalizeCnpjDigits(digits);
  if (normalized.length !== 14) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(CLIENTE_DB_COLUMNS)
    .eq("cnpj_digits", normalized)
    .maybeSingle();

  if (error) throw error;
  return (data as ClienteRecord | null) ?? null;
}

export async function assertClienteDisponivelParaAgendamento(
  clienteNome: string,
  options?: { agendamentoIdAtual?: string | null }
): Promise<void> {
  const trimmed = clienteNome.trim();
  if (!trimmed) return;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, disponivel_agendamento")
    .eq("nome", trimmed)
    .maybeSingle();

  if (error) throw error;
  if (!data) return;

  if (!isClienteDisponivelAgendamento(data.disponivel_agendamento)) {
    if (options?.agendamentoIdAtual) {
      const { data: agendamento, error: agError } = await supabase
        .from("agendamentos")
        .select("cliente_nome")
        .eq("id", options.agendamentoIdAtual)
        .maybeSingle();

      if (agError) throw agError;
      if (
        agendamento &&
        agendamento.cliente_nome.trim().toLowerCase() === trimmed.toLowerCase()
      ) {
        return;
      }
    }

    throw new ClienteIndisponivelAgendamentoError();
  }
}

export class ClienteIndisponivelAgendamentoError extends Error {
  constructor(message = CLIENTE_DISPONIVEL_AGENDAMENTO_MSG) {
    super(message);
    this.name = "ClienteIndisponivelAgendamentoError";
  }
}

export function isClienteIndisponivelAgendamentoError(
  error: unknown
): error is ClienteIndisponivelAgendamentoError {
  return error instanceof ClienteIndisponivelAgendamentoError;
}

export async function salvarCliente(
  cliente: ClienteInsert,
  options?: { usuarioNome?: string | null; motivoBloqueio?: string | null }
): Promise<string> {
  await assertCnpjClienteDisponivel(cliente.cnpj);

  const supabase = createClient();
  const payload: ClienteInsert = { ...cliente };

  if (cliente.disponivel_agendamento === false) {
    const bloqueio = buildCamposBloqueioManualAgendamento({
      disponivelNova: false,
      manualAnterior: false,
      motivo: options?.motivoBloqueio,
      usuarioNome: options?.usuarioNome,
    });
    Object.assign(payload, bloqueio);
  } else {
    payload.agendamento_bloqueio_manual = false;
    payload.agendamento_bloqueio_motivo = null;
    payload.agendamento_bloqueado_em = null;
    payload.agendamento_bloqueado_por = null;
  }

  const { data, error } = await supabase
    .from("clientes")
    .insert(payload)
    .select("id")
    .single();

  if (error) throwClienteSaveError(error);

  return data.id;
}

export async function atualizarCliente(
  id: string,
  cliente: ClienteUpdate,
  options?: { usuarioNome?: string | null; motivoBloqueio?: string | null }
): Promise<ClienteRecord> {
  await assertCnpjClienteDisponivel(cliente.cnpj, id);

  const supabase = createClient();

  const { data: atual, error: atualError } = await supabase
    .from("clientes")
    .select(
      "disponivel_agendamento, agendamento_bloqueio_manual, agendamento_bloqueado_em, agendamento_bloqueado_por, agendamento_bloqueio_motivo"
    )
    .eq("id", id)
    .single();

  if (atualError) throw atualError;

  const disponivelAnterior = isClienteDisponivelAgendamento(
    atual.disponivel_agendamento
  );
  const manualAnterior = atual.agendamento_bloqueio_manual === true;
  const disponivelNova = cliente.disponivel_agendamento === true;

  const bloqueioFields = buildCamposBloqueioManualAgendamento({
    disponivelNova,
    manualAnterior,
    bloqueadoEmAnterior: atual.agendamento_bloqueado_em,
    bloqueadoPorAnterior: atual.agendamento_bloqueado_por,
    motivoAnterior: atual.agendamento_bloqueio_motivo,
    motivo: options?.motivoBloqueio,
    usuarioNome: options?.usuarioNome,
  });

  const payload: ClienteUpdate = {
    ...cliente,
    ...bloqueioFields,
  };

  // Se a disponibilidade não mudou e não havia bloqueio manual, não force limpar metadados
  if (
    disponivelNova === disponivelAnterior &&
    !manualAnterior &&
    disponivelNova
  ) {
    payload.agendamento_bloqueio_manual = false;
    payload.agendamento_bloqueio_motivo = null;
    payload.agendamento_bloqueado_em = null;
    payload.agendamento_bloqueado_por = null;
  }

  const { data, error } = await supabase
    .from("clientes")
    .update(payload)
    .eq("id", id)
    .select(CLIENTE_DB_COLUMNS)
    .single();

  if (error) throwClienteSaveError(error);

  // Após liberação manual, recalcula regras automáticas (sem flag manual).
  if (disponivelNova && (manualAnterior || !disponivelAnterior)) {
    await supabase.rpc("recompute_cliente_disponivel_agendamento", {
      p_cliente_id: id,
    });
    const { data: refreshed, error: refreshError } = await supabase
      .from("clientes")
      .select(CLIENTE_DB_COLUMNS)
      .eq("id", id)
      .single();
    if (refreshError) throw refreshError;
    return refreshed as ClienteRecord;
  }

  return data as ClienteRecord;
}

export async function listarClientesPaginados(
  params: ListarClientesPaginadosParams = {}
): Promise<ListarClientesPaginadosResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 30;
  const busca = params.busca?.trim() ?? "";
  const agendamento = params.agendamento ?? "";

  if (busca) {
    const all = await listarTodosClientesParaBusca();
    const filtered = all.filter((record) => {
      if (!clienteRecordMatchesBusca(record, busca)) return false;
      if (!matchesClienteAgendamentoFilter(record, agendamento)) return false;
      return true;
    });
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const from = (safePage - 1) * pageSize;

    return {
      records: filtered.slice(from, from + pageSize),
      total,
      page: safePage,
      pageSize,
      totalPages,
    };
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createClient();
  let query = supabase
    .from("clientes")
    .select(CLIENTE_DB_COLUMNS, { count: "exact" })
    .order("nome", { ascending: true });

  if (agendamento === "liberado") {
    query = query.eq("disponivel_agendamento", true);
  } else if (agendamento === "bloqueado") {
    query = query.eq("disponivel_agendamento", false);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    records: (data ?? []) as ClienteRecord[],
    total,
    page,
    pageSize,
    totalPages,
  };
}

async function listarTodosClientesParaBusca(): Promise<ClienteRecord[]> {
  const supabase = createClient();
  const all: ClienteRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("clientes")
      .select(CLIENTE_LIST_COLUMNS)
      .order("nome", { ascending: true })
      .range(from, from + SELECT_BATCH_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []) as ClienteRecord[];
    all.push(...batch);

    if (batch.length < SELECT_BATCH_SIZE) break;
    from += SELECT_BATCH_SIZE;
  }

  return all;
}

export async function resolverPaginaClientePorNome(
  nome: string,
  pageSize = 30
): Promise<number> {
  const trimmed = nome.trim();
  if (!trimmed) return 1;

  const supabase = createClient();
  const { count, error } = await supabase
    .from("clientes")
    .select("id", { count: "exact", head: true })
    .lt("nome", trimmed);

  if (error) throw error;

  return Math.floor((count ?? 0) / pageSize) + 1;
}

/** Carrega todos os clientes (id, nome, cnpj) para selects e filtros globais. */
export async function listarClientesParaSelect(): Promise<ClienteRecord[]> {
  const supabase = createClient();
  const all: ClienteRecord[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("clientes")
      .select(CLIENTE_SELECT_COLUMNS)
      .order("nome", { ascending: true })
      .range(from, from + SELECT_BATCH_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []) as ClienteRecord[];
    all.push(...batch);

    if (batch.length < SELECT_BATCH_SIZE) break;
    from += SELECT_BATCH_SIZE;
  }

  return sortByNome(all);
}

/** @deprecated Use listarClientesParaSelect ou listarClientesPaginados. */
export async function listarClientes(limit = 100): Promise<ClienteRecord[]> {
  if (limit >= SELECT_BATCH_SIZE) {
    return listarClientesParaSelect();
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clientes")
    .select(CLIENTE_DB_COLUMNS)
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return sortByNome((data ?? []) as ClienteRecord[]);
}

export async function buscarClientePorId(
  id: string
): Promise<ClienteRecord | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select(CLIENTE_DB_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as ClienteRecord | null) ?? null;
}

export async function buscarClienteComContratos(
  id: string
): Promise<ClienteComContratos | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select(`${CLIENTE_DB_COLUMNS}, cliente_contratos(*)`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as ClienteComContratos;
  row.cliente_contratos = (row.cliente_contratos ?? []).sort((a, b) =>
    b.data_inicio.localeCompare(a.data_inicio)
  );

  return row;
}

export { resolveClienteCnpjError };
