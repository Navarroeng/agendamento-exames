import { createClient } from "@/lib/supabase/client";
import { parseItensInclusos } from "@/lib/servico-sst-pacote";
import type { ServicoSstRecord } from "@/lib/orcamento-types";

function mapServicoSstRow(row: Record<string, unknown>): ServicoSstRecord {
  const itens = parseItensInclusos(row.itens_inclusos);
  return {
    id: String(row.id ?? ""),
    nome: String(row.nome ?? ""),
    descricao: (row.descricao as string | null) ?? null,
    valor_sugerido:
      row.valor_sugerido == null ? null : Number(row.valor_sugerido),
    ativo: Boolean(row.ativo),
    ordem: Number(row.ordem ?? 0),
    itens_inclusos: itens.length > 0 ? itens : null,
    created_at: row.created_at as string | undefined,
  };
}

export async function listarServicosSst(
  apenasAtivos = true
): Promise<ServicoSstRecord[]> {
  const supabase = createClient();
  let query = supabase
    .from("servicos_sst")
    .select("*")
    .order("ordem", { ascending: true });

  if (apenasAtivos) {
    query = query.eq("ativo", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) =>
    mapServicoSstRow(row as Record<string, unknown>)
  );
}
