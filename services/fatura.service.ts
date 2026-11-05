import { addDiasIso } from "@/lib/clinica-fechamento";
import { lerTodosOsLotes } from "@/lib/consulta-lotes";
import {
  FATURA_STATUS_ELEGIVEIS,
  filterAgendamentosElegiveisFatura,
} from "@/lib/fatura-elegibilidade";
import { createClient } from "@/lib/supabase/client";
import type { AgendamentoWithExames } from "@/lib/types";

const AGENDAMENTOS_FATURA_SELECT = `
  *,
  agendamento_exames (
    id,
    agendamento_id,
    tipo_exame,
    valor_cliente,
    custo_clinica,
    incluso_credito_contrato
  )
`;

/**
 * Lista agendamentos elegíveis para faturamento.
 * Critério: status agendado ou ASO Retido. Pendências operacionais são ignoradas.
 * Com início e fim, percorre todas as páginas do intervalo.
 * O fim é inclusivo: a consulta usa o dia seguinte como limite exclusivo.
 */
export async function listarAgendamentosParaFatura(params?: {
  inicio?: string;
  fim?: string;
}): Promise<AgendamentoWithExames[]> {
  const supabase = createClient();
  const inicio = params?.inicio?.split("T")[0];
  const fim = params?.fim?.split("T")[0];
  const fimExclusivo = inicio && fim ? addDiasIso(fim, 1) : null;

  const todas = await lerTodosOsLotes(async (from, to) => {
    let query = supabase
      .from("agendamentos")
      .select(AGENDAMENTOS_FATURA_SELECT)
      .in("status", [...FATURA_STATUS_ELEGIVEIS])
      .order("data_agendamento", { ascending: true })
      .order("id", { ascending: true });
    if (inicio && fimExclusivo) {
      query = query.gte("data_agendamento", inicio).lt("data_agendamento", fimExclusivo);
    }
    const { data, error } = await query.range(from, to);
    if (error) throw error;
    return (data ?? []) as AgendamentoWithExames[];
  });

  return filterAgendamentosElegiveisFatura(todas);
}
