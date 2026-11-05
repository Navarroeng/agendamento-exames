import { consultaAgendamentos } from "@/lib/agendamento-consulta";
import type {
  CondicaoConsulta,
  OrdemConsulta,
} from "@/lib/agendamento-consulta";
import type { AgendamentoFilters } from "@/lib/agendamento-filters";
import { AGENDAMENTOS_PAGE_SIZE } from "@/lib/agendamento-filters";
import type { AgendamentoTableSortState } from "@/lib/agendamento-table-sort";
import {
  lerTodosOsLotes,
  montarPagina,
  type PaginaConsulta,
} from "@/lib/consulta-lotes";
import {
  consultaEsocial,
  consultaResumoEsocial,
  condicoesStatusEsocial,
} from "@/lib/esocial-consulta";
import {
  ESOCIAL_PAGE_SIZE,
  type ESocialFilters,
  type ESocialSummaryStats,
} from "@/lib/esocial-filters";
import type { ESocialTableSortState } from "@/lib/esocial-table-sort";
import { createClient } from "@/lib/supabase/client";
import type { AgendamentoExameRecord, AgendamentoWithExames } from "@/lib/types";

const EXAMES_EMBED = `
  id,
  agendamento_id,
  tipo_exame,
  valor_cliente,
  custo_clinica,
  motivo_valor_zero
`;

const SELECT_COM_EXAMES = `
  *,
  agendamento_exames (
    ${EXAMES_EMBED}
  )
`;

type Consulta = {
  eq: (coluna: string, valor: string | boolean) => Consulta;
  neq: (coluna: string, valor: string | boolean) => Consulta;
  gte: (coluna: string, valor: string) => Consulta;
  lt: (coluna: string, valor: string) => Consulta;
  ilike: (coluna: string, valor: string) => Consulta;
  in: (coluna: string, valor: string[]) => Consulta;
  or: (filtros: string) => Consulta;
  not: (coluna: string, operador: string, valor: string | boolean) => Consulta;
  order: (coluna: string, opcoes: { ascending: boolean }) => Consulta;
};

function aplicarConsulta(
  query: Consulta,
  condicoes: CondicaoConsulta[],
  ordem: OrdemConsulta[]
): Consulta {
  let atual = query;
  for (const condicao of condicoes) {
    if (condicao.op === "or") {
      atual = atual.or(condicao.valor);
    } else if (condicao.op === "in") {
      atual = atual.in(condicao.coluna, condicao.valor);
    } else if (condicao.op === "notEq") {
      atual = atual.not(condicao.coluna, "eq", condicao.valor);
    } else if (condicao.op === "ilike" || condicao.op === "gte" || condicao.op === "lt") {
      atual = atual[condicao.op](condicao.coluna, String(condicao.valor));
    } else {
      atual = atual[condicao.op](condicao.coluna, condicao.valor);
    }
  }
  for (const item of ordem) {
    atual = atual.order(item.coluna, { ascending: item.ascending });
  }
  return atual;
}

async function anexarExamesCompletos(
  records: AgendamentoWithExames[]
): Promise<AgendamentoWithExames[]> {
  const ids = records.map((row) => row.id);
  if (ids.length === 0) return records;
  const supabase = createClient();
  const exames = await lerTodosOsLotes(async (from, to) => {
    const { data, error } = await supabase
      .from("agendamento_exames")
      .select(EXAMES_EMBED)
      .in("agendamento_id", ids)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as AgendamentoExameRecord[];
  });
  const porAgendamento = new Map<string, AgendamentoExameRecord[]>();
  for (const exame of exames) {
    const lista = porAgendamento.get(exame.agendamento_id) ?? [];
    lista.push(exame);
    porAgendamento.set(exame.agendamento_id, lista);
  }
  return records.map((row) => ({
    ...row,
    agendamento_exames: porAgendamento.get(row.id) ?? [],
  }));
}

export async function listarAgendamentosPagina(params: {
  filters: AgendamentoFilters;
  page?: number;
  pageSize?: number;
  sort?: AgendamentoTableSortState | null;
}): Promise<PaginaConsulta<AgendamentoWithExames>> {
  const pageSize = params.pageSize ?? AGENDAMENTOS_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const consulta = consultaAgendamentos(params.filters, params.sort ?? null);
  const supabase = createClient();
  const select = consulta.tipoExame
    ? "*, agendamento_exames!inner(id)"
    : SELECT_COM_EXAMES;

  // O builder do Supabase fica profundo demais para o TypeScript quando reatribuído.
  let query = supabase
    .from("agendamentos")
    .select(select, { count: "exact" }) as any;
  query = aplicarConsulta(query, consulta.condicoes, consulta.ordem);
  if (consulta.tipoExame) {
    query = query.ilike(
      "agendamento_exames.tipo_exame",
      `%${consulta.tipoExame}%`
    );
  }

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;

  let records = (data ?? []) as AgendamentoWithExames[];
  if (consulta.tipoExame) {
    records = await anexarExamesCompletos(records);
  }
  return montarPagina(records, count ?? 0, page, pageSize);
}

export async function listarAgendamentosEsocialPagina(params: {
  filters: ESocialFilters;
  page?: number;
  pageSize?: number;
  sort?: ESocialTableSortState | null;
}): Promise<PaginaConsulta<AgendamentoWithExames>> {
  const pageSize = params.pageSize ?? ESOCIAL_PAGE_SIZE;
  const page = Math.max(1, params.page ?? 1);
  const consulta = consultaEsocial(params.filters, params.sort ?? null);
  const supabase = createClient();
  let query = supabase
    .from("agendamentos")
    .select(SELECT_COM_EXAMES, { count: "exact" }) as any;
  query = aplicarConsulta(query, consulta.condicoes, consulta.ordem);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return montarPagina(
    (data ?? []) as AgendamentoWithExames[],
    count ?? 0,
    page,
    pageSize
  );
}

async function contarAgendamentos(
  condicoes: CondicaoConsulta[]
): Promise<number> {
  const supabase = createClient();
  let query = supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true }) as any;
  query = aplicarConsulta(query, condicoes, []);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function contarResumoEsocial(
  filters: ESocialFilters
): Promise<ESocialSummaryStats> {
  const base = consultaResumoEsocial(filters).condicoes;
  const [enviados, pendentes, urgentes, cancelados] = await Promise.all([
    contarAgendamentos([...base, ...condicoesStatusEsocial("enviado")]),
    contarAgendamentos([...base, ...condicoesStatusEsocial("pendente")]),
    contarAgendamentos([...base, ...condicoesStatusEsocial("urgente")]),
    contarAgendamentos([...base, ...condicoesStatusEsocial("cancelado")]),
  ]);
  const totalElegivel = enviados + pendentes + urgentes;
  return {
    totalElegivel,
    pendentes,
    enviarUrgente: urgentes,
    enviados,
    cancelados,
    percentualEnviado:
      totalElegivel > 0 ? Math.round((enviados / totalElegivel) * 100) : 0,
  };
}

/** Nomes de clínica usados em agendamentos, sem teto de leitura. */
export async function listarNomesClinicaAgendamentos(): Promise<string[]> {
  const supabase = createClient();
  const linhas = await lerTodosOsLotes(async (from, to) => {
    const { data, error } = await supabase
      .from("agendamentos")
      .select("clinica_nome")
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as Array<{ clinica_nome: string | null }>;
  });
  const nomes = new Set<string>();
  for (const linha of linhas) {
    const nome = linha.clinica_nome?.trim();
    if (nome) nomes.add(nome);
  }
  return Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
