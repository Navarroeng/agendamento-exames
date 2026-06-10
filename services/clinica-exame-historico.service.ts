import { createClient } from "@/lib/supabase/client";
import type { ClinicaExameHistoricoRecord } from "@/lib/types";

export interface ClinicaExameHistoricoEntryDraft {
  acao: string;
  detalhes: string;
}

export async function registrarHistoricoClinicaExame(
  clinicaId: string,
  usuario: string,
  entries: ClinicaExameHistoricoEntryDraft[],
  clinicaExameId?: string | null
): Promise<void> {
  if (entries.length === 0) return;

  const supabase = createClient();

  const rows = entries.map((entry) => ({
    clinica_id: clinicaId,
    clinica_exame_id: clinicaExameId ?? null,
    usuario,
    acao: entry.acao,
    detalhes: entry.detalhes,
  }));

  const { error } = await supabase
    .from("clinica_exames_historico")
    .insert(rows);

  if (error) throw error;
}

export async function listarHistoricoClinicaExames(
  clinicaId: string
): Promise<ClinicaExameHistoricoRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinica_exames_historico")
    .select("*")
    .eq("clinica_id", clinicaId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ClinicaExameHistoricoRecord[];
}
