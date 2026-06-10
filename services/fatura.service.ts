import {
  FATURA_STATUS_ELEGIVEL,
  filterAgendamentosElegiveisFatura,
} from "@/lib/fatura-elegibilidade";
import { createClient } from "@/lib/supabase/client";
import type { AgendamentoWithExames } from "@/lib/types";

/**
 * Lista agendamentos elegíveis para faturamento.
 * Critério único: status = agendado. Pendências operacionais são ignoradas.
 */
export async function listarAgendamentosParaFatura(
  limit = 2000
): Promise<AgendamentoWithExames[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      `
      *,
      agendamento_exames (
        id,
        agendamento_id,
        tipo_exame,
        valor_cliente,
        custo_clinica
      )
    `
    )
    .eq("status", FATURA_STATUS_ELEGIVEL)
    .order("data_agendamento", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return filterAgendamentosElegiveisFatura(
    (data ?? []) as AgendamentoWithExames[]
  );
}
