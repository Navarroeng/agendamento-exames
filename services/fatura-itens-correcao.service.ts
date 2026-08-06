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

  const [
    { data: clientesRows, error: cErr },
    { data: faturasCliente, error: fErr },
  ] = await Promise.all([
    supabase.from("clientes").select("id, nome, cnpj").limit(5000),
    supabase
      .from("faturas")
      .select("id, referencia_nome, referencia_id, status")
      .eq("tipo", "cliente")
      .limit(5000),
  ]);

  if (cErr) throw cErr;
  if (fErr) throw fErr;

  const catalog = (clientesRows ?? []) as ClienteCatalogItem[];
  const faturas = faturasCliente ?? [];
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
  const { data: itens, error: iErr } = await supabase
    .from("fatura_itens")
    .select("id, fatura_id, agendamento_id")
    .in("fatura_id", faturaIds)
    .not("agendamento_id", "is", null)
    .limit(20000);
  if (iErr) throw iErr;

  const rows = itens ?? [];
  if (rows.length === 0) {
    return { faturasAfetadas: 0, itensRemovidos: 0 };
  }

  const agIds = Array.from(
    new Set(rows.map((r) => String(r.agendamento_id)).filter(Boolean))
  );
  const { data: ags, error: aErr } = await supabase
    .from("agendamentos")
    .select("id, cliente_nome, cliente_id")
    .in("id", agIds);
  if (aErr) throw aErr;

  const agById = new Map(
    (ags ?? []).map((a) => [
      String(a.id),
      {
        cliente_id: (a.cliente_id as string | null) ?? null,
        cliente_nome: String(a.cliente_nome ?? ""),
      },
    ])
  );

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
    const { data: remaining, error: rErr } = await supabase
      .from("fatura_itens")
      .select("valor_total")
      .eq("fatura_id", faturaId);
    if (rErr) throw rErr;
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
