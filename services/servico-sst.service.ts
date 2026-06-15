import { createClient } from "@/lib/supabase/client";
import type { ServicoSstRecord } from "@/lib/orcamento-types";

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
  return (data ?? []) as ServicoSstRecord[];
}
