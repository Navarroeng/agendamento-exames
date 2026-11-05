import { lerTodosOsLotes } from "@/lib/consulta-lotes";
import { createClient } from "@/lib/supabase/client";
import {
  isAgendamentoDaEmpresa,
  type ClienteCatalogItem,
} from "@/lib/fatura-empresa-match";

export type CorrecaoFaturaItensResultado = {
  faturasAfetadas: number;
  itensRemovidos: number;
};

/**
 * Remove fatura_itens de faturas de cliente cujo agendamento atual
 * pertence a outra empresa (id/CNPJ/nome exato). Recalcula totais.
 * Não exclui agendamentos.
 */
export async function corrigirItensFaturaClienteInconsistentes(): Promise<CorrecaoFaturaItensResultado> {
  const supabase = createClient();

  const catalog = await lerTodosOsLotes(async (from, to) => {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, cnpj")
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as ClienteCatalogItem[];
  });

  const faturas = await lerTodosOsLotes(async (from, to) => {
    const { data, error } = await supabase
      .from("faturas")
      .select("id, referencia_nome, referencia_id, status")
      .eq("tipo", "cliente")
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });
  if (faturas.length === 0) {
    return { faturasAfetadas: 0, itensRemovidos: 0 };
  }

  const faturaById = new Map(
    faturas.map((f) => [
      String(f.id),
      {
        id: String(f.id),
        referencia_nome: String(f.referencia_nome ?? ""),
        referencia_id: (f.referencia_id as string | null) ?? null,
      },
    ])
  );

  const faturaIds = Array.from(faturaById.keys());
  const rows: Array<{
    id: string;
    fatura_id: string;
    agendamento_id: string | null;
  }> = [];
  for (let i = 0; i < faturaIds.length; i += 100) {
    const ids = faturaIds.slice(i, i + 100);
    const lote = await lerTodosOsLotes(async (from, to) => {
      const { data, error } = await supabase
        .from("fatura_itens")
        .select("id, fatura_id, agendamento_id")
        .in("fatura_id", ids)
        .not("agendamento_id", "is", null)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as typeof rows;
    });
    rows.push(...lote);
  }
  if (rows.length === 0) {
    return { faturasAfetadas: 0, itensRemovidos: 0 };
  }

  const agIds = Array.from(
    new Set(rows.map((r) => String(r.agendamento_id)).filter(Boolean))
  );
  const agById = new Map<
    string,
    { cliente_id: string | null; cliente_nome: string }
  >();
  for (let i = 0; i < agIds.length; i += 100) {
    const ids = agIds.slice(i, i + 100);
    const lote = await lerTodosOsLotes(async (from, to) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, cliente_nome, cliente_id")
        .in("id", ids)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    });
    for (const a of lote) {
      agById.set(String(a.id), {
        cliente_id: (a.cliente_id as string | null) ?? null,
        cliente_nome: String(a.cliente_nome ?? ""),
      });
    }
  }

  const toDelete: string[] = [];
  const affectedFaturas = new Set<string>();

  for (const row of rows) {
    const fatura = faturaById.get(String(row.fatura_id));
    const ag = agById.get(String(row.agendamento_id));
    if (!fatura || !ag) continue;
    const pertence = isAgendamentoDaEmpresa(
      ag,
      {
        id: fatura.referencia_id,
        nome: fatura.referencia_nome,
      },
      catalog
    );
    if (!pertence) {
      toDelete.push(String(row.id));
      affectedFaturas.add(String(row.fatura_id));
    }
  }

  if (toDelete.length === 0) {
    return { faturasAfetadas: 0, itensRemovidos: 0 };
  }

  const chunkSize = 200;
  for (let i = 0; i < toDelete.length; i += chunkSize) {
    const chunk = toDelete.slice(i, i + chunkSize);
    const { error } = await supabase.from("fatura_itens").delete().in("id", chunk);
    if (error) throw error;
  }

  for (const faturaId of Array.from(affectedFaturas)) {
    const remaining = await lerTodosOsLotes(async (from, to) => {
      const { data, error } = await supabase
        .from("fatura_itens")
        .select("valor_total")
        .eq("fatura_id", faturaId)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return data ?? [];
    });
    const valorTotal = (remaining ?? []).reduce(
      (sum, item) => sum + Number(item.valor_total),
      0
    );
    const { error: uErr } = await supabase
      .from("faturas")
      .update({
        valor_total: valorTotal,
        total_exames: remaining?.length ?? 0,
      })
      .eq("id", faturaId);
    if (uErr) throw uErr;
  }

  return {
    faturasAfetadas: affectedFaturas.size,
    itensRemovidos: toDelete.length,
  };
}
