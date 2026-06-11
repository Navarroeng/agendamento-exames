import { createClient } from "@/lib/supabase/client";
import {
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import type { ClinicaHistoricoEntryDraft } from "@/lib/clinica-historico-diff";
import type { ClinicaHistoricoRecord } from "@/lib/types";
import { syncHistoricoEntriesToAuditoria } from "@/services/auditoria.service";

export interface ClinicaHistoricoAuditOptions {
  auditContext?: AuditoriaUsuarioContext;
  registroNome?: string | null;
}

export async function registrarHistoricoClinica(
  clinicaId: string,
  usuario: string,
  entries: ClinicaHistoricoEntryDraft[],
  options?: ClinicaHistoricoAuditOptions
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

  await syncHistoricoEntriesToAuditoria(
    options?.auditContext,
    AUDITORIA_MODULOS.clinicas,
    clinicaId,
    options?.registroNome,
    entries
  );
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
