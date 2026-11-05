import { addDiasIso } from "@/lib/clinica-fechamento";
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
  limit?: number;
  inicio?: string;
  fim?: string;
}): Promise<AgendamentoWithExames[]> {
  const supabase = createClient();
  const inicio = params?.inicio?.split("T")[0];
  const fim = params?.fim?.split("T")[0];
  const comIntervalo = Boolean(inicio && fim);

  if (!comIntervalo) {
    const { data, error } = await supabase
      .from("agendamentos")
      .select(AGENDAMENTOS_FATURA_SELECT)
      .in("status", [...FATURA_STATUS_ELEGIVEIS])
      .order("data_agendamento", { ascending: false })
      .limit(params?.limit ?? 2000);

    if (error) throw error;
    return filterAgendamentosElegiveisFatura(
      (data ?? []) as AgendamentoWithExames[]
    );
  }

  const fimExclusivo = addDiasIso(fim as string, 1);
  const pageSize = 1000;
  const todas: AgendamentoWithExames[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("agendamentos")
      .select(AGENDAMENTOS_FATURA_SELECT)
      .in("status", [...FATURA_STATUS_ELEGIVEIS])
      .gte("data_agendamento", inicio as string)
      .lt("data_agendamento", fimExclusivo)
      .order("data_agendamento", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const pagina = (data ?? []) as AgendamentoWithExames[];
    todas.push(...pagina);
    if (pagina.length < pageSize) break;
  }

  return filterAgendamentosElegiveisFatura(todas);
}
