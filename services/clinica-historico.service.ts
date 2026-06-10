import { createClient } from "@/lib/supabase/client";
import type { ClinicaHistoricoEntryDraft } from "@/lib/clinica-historico-diff";
import type { ClinicaHistoricoRecord } from "@/lib/types";

export async function registrarHistoricoClinica(
  clinicaId: string,
  usuario: string,
  entries: ClinicaHistoricoEntryDraft[]
): Promise<void> {
  if (entries.length === 0) return;

  const supabase = createClient();

  const rows = entries.map((entry) => ({
    clinica_id: clinicaId,
    usuario,
    acao: entry.acao,
    detalhes: entry.detalhes,
  }));

  const { error } = await supabase.from("clinicas_historico").insert(rows);

  if (error) throw error;
}

export async function listarHistoricoClinica(
  clinicaId: string
): Promise<ClinicaHistoricoRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("clinicas_historico")
    .select("*")
    .eq("clinica_id", clinicaId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as ClinicaHistoricoRecord[];
}
