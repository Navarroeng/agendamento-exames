import {
  isoDataCivil,
  mesFechamentoDaFatura,
  mesSeguinte,
  parseMesReferenciaBR,
} from "@/lib/clinica-fechamento";
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

/**
 * Faturas de clínica cuja data de vencimento salva cai no mês.
 * Não usa a competência de fechamento nem a data de pagamento.
 */
export async function listarFaturasClinicaNoVencimento(
  mesVencimento: string
): Promise<FaturaRecord[]> {
  const parsed = parseMesReferenciaBR(mesVencimento);
  if (!parsed) return [];
  const inicio = isoDataCivil(parsed.ano, parsed.mes, 1);
  const proximo = mesSeguinte(parsed.ano, parsed.mes);
  const fimExclusivo = isoDataCivil(proximo.ano, proximo.mes, 1);

  const supabase = createClient();
  const rows = await coletarPaginas(async (from, pageSize) => {
    const { data, error } = await supabase
      .from("faturas")
      .select("*")
      .eq("tipo", "clinica")
      .gte("data_vencimento", inicio)
      .lt("data_vencimento", fimExclusivo)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    return (data ?? []) as FaturaRecord[];
  }, FATURA_COMPETENCIA_PAGE_SIZE);

  const vistas = new Set<string>();
  return rows.filter((fatura) => {
    if (vistas.has(fatura.id)) return false;
    vistas.add(fatura.id);
    const data = (fatura.data_vencimento ?? "").split("T")[0];
    return data >= inicio && data < fimExclusivo;
  });
}

/**
 * Faturas de clínica sem data de vencimento, no ano do fechamento.
 * Não completa a data com o fechamento.
 */
export async function listarFaturasClinicaSemVencimento(
  anoFechamento: number
): Promise<FaturaRecord[]> {
  if (!Number.isInteger(anoFechamento) || anoFechamento < 2000) return [];

  const supabase = createClient();
  const rows = await coletarPaginas(async (from, pageSize) => {
    const { data, error } = await supabase
      .from("faturas")
      .select("*")
      .eq("tipo", "clinica")
      .is("data_vencimento", null)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    return (data ?? []) as FaturaRecord[];
  }, FATURA_COMPETENCIA_PAGE_SIZE);

  const vistas = new Set<string>();
  return rows.filter((fatura) => {
    if (vistas.has(fatura.id)) return false;
    vistas.add(fatura.id);
    if ((fatura.data_vencimento ?? "").trim()) return false;
    return mesFechamentoDaFatura(fatura)?.ano === anoFechamento;
  });
}
