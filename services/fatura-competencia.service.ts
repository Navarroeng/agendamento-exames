import {
  coletarPaginas,
  competenciaIsoFromTexto,
  FATURA_COMPETENCIA_PAGE_SIZE,
  faturaPertenceACompetencia,
  filtroOrFaturasDaCompetencia,
} from "@/lib/fatura-competencia";
import { createClient } from "@/lib/supabase/client";
import type { FaturaRecord, FaturaTipo } from "@/lib/types";

/**
 * Todas as faturas do tipo na competência, sem teto por data de criação.
 * A paginação continua até a última página e a regra de mês é a mesma da emissão.
 */
export async function listarFaturasDaCompetencia(
  tipo: FaturaTipo,
  mesReferencia: string
): Promise<FaturaRecord[]> {
  const mesIso = competenciaIsoFromTexto(mesReferencia);
  const filtro = mesIso ? filtroOrFaturasDaCompetencia(mesIso) : null;
  if (!mesIso || !filtro) return [];

  const supabase = createClient();
  const rows = await coletarPaginas(async (from, pageSize) => {
    const { data, error } = await supabase
      .from("faturas")
      .select("*")
      .eq("tipo", tipo)
      .or(filtro)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    return (data ?? []) as FaturaRecord[];
  }, FATURA_COMPETENCIA_PAGE_SIZE);

  const vistas = new Set<string>();
  return rows.filter((fatura) => {
    if (vistas.has(fatura.id)) return false;
    vistas.add(fatura.id);
    return faturaPertenceACompetencia(fatura, mesIso);
  });
}
