import { createClient } from "@/lib/supabase/client";
import {
  buildContratoAgendamentoContagem,
  countColaboradoresUnicos,
  type ContratoAgendamentoContagem,
} from "@/lib/contrato-agendamentos";
import { contratoLiberaAgendamento } from "@/lib/cliente-pode-agendar";
import { listarClientesParaSelect } from "@/services/cliente.service";
import { listarContratosPorCliente } from "@/services/cliente-contrato.service";
import type {
  AgendamentoStatus,
  AgendamentoWithExames,
  ClienteContratoRecord,
} from "@/lib/types";

const AGENDAMENTO_SELECT = `
  *,
  agendamento_exames (
    id,
    agendamento_id,
    tipo_exame,
    valor_cliente,
    custo_clinica,
    motivo_valor_zero
  )
`;

export async function buscarContratoPorOrcamentoId(
  orcamentoId: string
): Promise<ClienteContratoRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .eq("orcamento_id", orcamentoId)
    .order("aprovado_em", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as ClienteContratoRecord | null) ?? null;
}

export async function listarAgendamentosPorContrato(
  contratoId: string
): Promise<AgendamentoWithExames[]> {
  if (!contratoId) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select(AGENDAMENTO_SELECT)
    .eq("contrato_id", contratoId)
    .order("data_agendamento", { ascending: true })
    .order("horario", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AgendamentoWithExames[];
}

/** Contagem de colaboradores únicos por contrato (exclui cancelados). */
export async function contarColaboradoresPorContratos(
  contratoIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (contratoIds.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select("id, contrato_id, status, colaborador, colaborador_cpf")
    .in("contrato_id", contratoIds)
    .neq("status", "cancelado");

  if (error) throw error;

  const byContrato = new Map<
    string,
    Array<{
      status: AgendamentoStatus;
      contrato_id: string | null;
      colaborador: string;
      colaborador_cpf: string;
    }>
  >();

  for (const row of data ?? []) {
    const cid = row.contrato_id as string | null;
    if (!cid) continue;
    const list = byContrato.get(cid) ?? [];
    list.push({
      status: row.status as AgendamentoStatus,
      contrato_id: cid,
      colaborador: String(row.colaborador ?? ""),
      colaborador_cpf: String(row.colaborador_cpf ?? ""),
    });
    byContrato.set(cid, list);
  }

  for (const id of contratoIds) {
    const list = byContrato.get(id) ?? [];
    map.set(id, countColaboradoresUnicos(list, id));
  }

  return map;
}

export async function carregarResumoAgendamentosContrato(params: {
  contratoId: string;
  quantidadeContratada: number;
}): Promise<{
  agendamentos: AgendamentoWithExames[];
  contagem: ContratoAgendamentoContagem;
}> {
  const agendamentos = await listarAgendamentosPorContrato(params.contratoId);
  const realizados = countColaboradoresUnicos(agendamentos, params.contratoId);
  return {
    agendamentos,
    contagem: buildContratoAgendamentoContagem(
      params.quantidadeContratada,
      realizados
    ),
  };
}

export type ContratoAptoAgendamento = {
  contrato: ClienteContratoRecord;
  realizados: number;
  contratados: number;
  disponiveis: number;
};

/**
 * Contratos originados de orçamento aptos a receber agendamentos do cliente.
 * Não inclui contratos sem orçamento_id (cadastro manual legado).
 */
export async function listarContratosAptosParaAgendamento(
  clienteNome: string
): Promise<ContratoAptoAgendamento[]> {
  const nome = clienteNome.trim();
  if (!nome) return [];

  const clientes = await listarClientesParaSelect();
  const cliente = clientes.find(
    (c) => c.nome.trim().toLowerCase() === nome.toLowerCase()
  );
  if (!cliente) return [];

  const contratos = await listarContratosPorCliente(cliente.id);
  const aptos = contratos.filter(
    (c) =>
      Boolean(c.orcamento_id) &&
      (contratoLiberaAgendamento(c) || c.status === "ativo")
  );

  if (aptos.length === 0) return [];

  const counts = await contarColaboradoresPorContratos(aptos.map((c) => c.id));

  return aptos.map((contrato) => {
    const contratados = Math.max(0, Number(contrato.quantidade_colaboradores) || 0);
    const realizados = counts.get(contrato.id) ?? 0;
    return {
      contrato,
      realizados,
      contratados,
      disponiveis: Math.max(0, contratados - realizados),
    };
  });
}
