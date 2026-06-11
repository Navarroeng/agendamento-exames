import { createClient } from "@/lib/supabase/client";
import {
  AUDITORIA_MODULOS,
  type AuditoriaModulo,
  type AuditoriaUsuarioContext,
} from "@/lib/auditoria";
import type { HistoricoEntryDraft } from "@/lib/agendamento-historico-diff";
import type { AgendamentoHistoricoRecord } from "@/lib/types";
import { syncHistoricoEntriesToAuditoria } from "@/services/auditoria.service";

export interface HistoricoAuditOptions {
  auditContext?: AuditoriaUsuarioContext;
  auditModulo?: AuditoriaModulo;
  registroNome?: string | null;
}

export async function registrarHistorico(
  agendamentoId: string,
  usuario: string,
  entries: HistoricoEntryDraft[],
  options?: HistoricoAuditOptions
): Promise<void> {
  if (entries.length === 0) return;

  const supabase = createClient();

  const rows = entries.map((entry) => ({
    agendamento_id: agendamentoId,
    usuario,
    acao: entry.acao,
    detalhes: entry.detalhes,
  }));

  const { error } = await supabase.from("agendamento_historico").insert(rows);

  if (error) throw error;

  await syncHistoricoEntriesToAuditoria(
    options?.auditContext,
    options?.auditModulo ?? AUDITORIA_MODULOS.agendamentos,
    agendamentoId,
    options?.registroNome,
    entries
  );
}

export async function listarHistoricoAgendamento(
  agendamentoId: string
): Promise<AgendamentoHistoricoRecord[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agendamento_historico")
    .select("*")
    .eq("agendamento_id", agendamentoId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []) as AgendamentoHistoricoRecord[];
}
