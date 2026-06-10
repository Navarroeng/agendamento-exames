import { createClient } from "@/lib/supabase/client";
import type {
  ClinicaExameRecord,
  ClinicaExameWithExame,
} from "@/lib/types";

export interface ClinicaExameInsert {
  clinica_id: string;
  exame_id: string;
  custo_clinica: number;
  valor_navarro: number;
  prazo_resultado: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export async function listarClinicaExames(
  clinicaId: string
): Promise<ClinicaExameWithExame[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinica_exames")
    .select(
      `
      *,
      exames (*)
    `
    )
    .eq("clinica_id", clinicaId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    ...(row as ClinicaExameRecord),
    exames: (row as { exames: ClinicaExameWithExame["exames"] }).exames,
  }));
}

export async function contarExamesPorClinica(
  clinicaIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (clinicaIds.length === 0) return map;

  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinica_exames")
    .select("clinica_id")
    .in("clinica_id", clinicaIds)
    .eq("ativo", true);

  if (error) throw error;

  (data ?? []).forEach((row) => {
    const id = row.clinica_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  });

  return map;
}

export async function criarClinicaExame(
  payload: ClinicaExameInsert
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinica_exames")
    .insert({ ...payload, updated_at: new Date().toISOString() })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function atualizarClinicaExame(
  id: string,
  payload: ClinicaExameInsert
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("clinica_exames")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function buscarClinicaExamePorId(
  id: string
): Promise<ClinicaExameWithExame | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinica_exames")
    .select(`*, exames (*)`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...(data as ClinicaExameRecord),
    exames: (data as { exames: ClinicaExameWithExame["exames"] }).exames,
  };
}
