import { createClient } from "@/lib/supabase/client";
import { CLIENTE_DB_COLUMNS } from "@/lib/cliente-schema";
import type {
  ClienteComContratos,
  ClienteInsert,
  ClienteRecord,
} from "@/lib/types";

export async function salvarCliente(cliente: ClienteInsert): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clientes")
    .insert(cliente)
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

export async function listarClientes(limit = 100): Promise<ClienteRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clientes")
    .select(CLIENTE_DB_COLUMNS)
    .order("nome", { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data ?? []) as ClienteRecord[];
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
