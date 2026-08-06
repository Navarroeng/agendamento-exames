import {
  FATURA_STATUS_ELEGIVEIS,
  filterAgendamentosElegiveisFatura,
} from "@/lib/fatura-elegibilidade";
import { createClient } from "@/lib/supabase/client";
import type { AgendamentoWithExames } from "@/lib/types";

/**
 * Lista agendamentos elegíveis para faturamento.
 * Critério: status agendado ou ASO Retido. Pendências operacionais são ignoradas.
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
        custo_clinica,
        incluso_credito_contrato
      )
    `
    )
    .in("status", [...FATURA_STATUS_ELEGIVEIS])
    .order("data_agendamento", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return filterAgendamentosElegiveisFatura(
    (data ?? []) as AgendamentoWithExames[]
  );
}
