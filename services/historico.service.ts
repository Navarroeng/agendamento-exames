import { createClient } from "@/lib/supabase/client";
import type { HistoricoEntryDraft } from "@/lib/agendamento-historico-diff";
import type { AgendamentoHistoricoRecord } from "@/lib/types";

export async function registrarHistorico(
  agendamentoId: string,
  usuario: string,
  entries: HistoricoEntryDraft[]
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
