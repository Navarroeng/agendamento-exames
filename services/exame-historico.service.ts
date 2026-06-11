import { createClient } from "@/lib/supabase/client";
import {
  AUDITORIA_MODULOS,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import type { ExameHistoricoRecord } from "@/lib/types";
import { syncHistoricoEntriesToAuditoria } from "@/services/auditoria.service";

export interface ExameHistoricoEntryDraft {
  acao: string;
  detalhes: string;
}

export interface ExameHistoricoAuditOptions {
  auditContext?: AuditoriaUsuarioContext;
  registroNome?: string | null;
}

export async function registrarHistoricoExame(
  exameId: string,
  usuario: string,
  entries: ExameHistoricoEntryDraft[],
  options?: ExameHistoricoAuditOptions
): Promise<void> {
  if (entries.length === 0) return;

  const supabase = createClient();

  const rows = entries.map((entry) => ({
    exame_id: exameId,
    usuario,
    acao: entry.acao,
    detalhes: entry.detalhes,
  }));

  const { error } = await supabase.from("exames_historico").insert(rows);
  if (error) throw error;

  await syncHistoricoEntriesToAuditoria(
    options?.auditContext,
    AUDITORIA_MODULOS.exames,
    exameId,
    options?.registroNome,
    entries
  );
}

export async function listarHistoricoExame(
  exameId: string
): Promise<ExameHistoricoRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("exames_historico")
    .select("*")
    .eq("exame_id", exameId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ExameHistoricoRecord[];
}
