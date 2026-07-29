import { createClient } from "@/lib/supabase/client";
import {
  agendamentoConsomeSaldoContrato,
  buildContratoAgendamentoContagem,
  colaboradorJaConsomeSaldoNoContrato,
  countAgendamentosAdicionais,
  countColaboradoresUnicos,
  statusContratoPodeReceberVinculo,
  type ContratoAgendamentoContagem,
} from "@/lib/contrato-agendamentos";
import { contratoLiberaAgendamento } from "@/lib/cliente-pode-agendar";
import {
  formatOrcamentoOrigemCliente,
  type OrcamentoOrigemCliente,
} from "@/lib/orcamento-origem";
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

export async function buscarContratoPorId(
  contratoId: string
): Promise<ClienteContratoRecord | null> {
  if (!contratoId) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cliente_contratos")
    .select("*")
    .eq("id", contratoId)
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

type ContagemRow = {
  id: string;
  status: AgendamentoStatus;
  contrato_id: string | null;
  colaborador: string;
  colaborador_cpf: string;
  consome_saldo_contrato: boolean | null;
};

async function fetchContagemRows(
  contratoIds: string[]
): Promise<ContagemRow[]> {
  if (contratoIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      "id, contrato_id, status, colaborador, colaborador_cpf, consome_saldo_contrato"
    )
    .in("contrato_id", contratoIds)
    .neq("status", "cancelado");

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: String(row.id),
    status: row.status as AgendamentoStatus,
    contrato_id: (row.contrato_id as string | null) ?? null,
    colaborador: String(row.colaborador ?? ""),
    colaborador_cpf: String(row.colaborador_cpf ?? ""),
    consome_saldo_contrato:
      row.consome_saldo_contrato == null
        ? null
        : Boolean(row.consome_saldo_contrato),
  }));
}

/** Contagem de colaboradores que consomem saldo, por contrato. */
export async function contarColaboradoresPorContratos(
  contratoIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (contratoIds.length === 0) return map;

  const rows = await fetchContagemRows(contratoIds);
  const byContrato = new Map<string, ContagemRow[]>();
  for (const row of rows) {
    const cid = row.contrato_id;
    if (!cid) continue;
    const list = byContrato.get(cid) ?? [];
    list.push(row);
    byContrato.set(cid, list);
  }

  for (const id of contratoIds) {
    map.set(id, countColaboradoresUnicos(byContrato.get(id) ?? [], id));
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
  const utilizados = countColaboradoresUnicos(agendamentos, params.contratoId);
  const adicionais = countAgendamentosAdicionais(
    agendamentos,
    params.contratoId
  );
  return {
    agendamentos,
    contagem: buildContratoAgendamentoContagem(
      params.quantidadeContratada,
      utilizados,
      adicionais
    ),
  };
}

export type ContratoAptoAgendamento = {
  contrato: ClienteContratoRecord;
  realizados: number;
  contratados: number;
  disponiveis: number;
  origemLabel: string;
  origem: OrcamentoOrigemCliente | null;
};

function isContratoOrcamentoLiberado(c: ClienteContratoRecord): boolean {
  return (
    Boolean(c.orcamento_id) &&
    statusContratoPodeReceberVinculo(c.status) &&
    contratoLiberaAgendamento(c)
  );
}

async function mapOrigensOrcamento(
  orcamentoIds: string[]
): Promise<Map<string, OrcamentoOrigemCliente | null>> {
  const map = new Map<string, OrcamentoOrigemCliente | null>();
  if (orcamentoIds.length === 0) return map;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("id, origem_cliente")
    .in("id", orcamentoIds);
  if (error) throw error;
  for (const row of data ?? []) {
    map.set(
      String(row.id),
      (row.origem_cliente as OrcamentoOrigemCliente | null) ?? null
    );
  }
  return map;
}

async function toContratoAptoList(
  contratos: ClienteContratoRecord[]
): Promise<ContratoAptoAgendamento[]> {
  if (contratos.length === 0) return [];
  const counts = await contarColaboradoresPorContratos(
    contratos.map((c) => c.id)
  );
  const origemMap = await mapOrigensOrcamento(
    contratos.map((c) => c.orcamento_id!).filter(Boolean)
  );

  return contratos.map((contrato) => {
    const contratados = Math.max(
      0,
      Number(contrato.quantidade_colaboradores) || 0
    );
    const realizados = counts.get(contrato.id) ?? 0;
    const origem = contrato.orcamento_id
      ? origemMap.get(contrato.orcamento_id) ?? null
      : null;
    return {
      contrato,
      realizados,
      contratados,
      disponiveis: Math.max(0, contratados - realizados),
      origem,
      origemLabel: formatOrcamentoOrigemCliente(origem),
    };
  });
}

/**
 * Contratos de orçamento liberados do cliente (com ou sem saldo).
 * Não inclui manuais nem contratos bloqueados financeiramente.
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
  const aptos = contratos.filter(isContratoOrcamentoLiberado);
  return toContratoAptoList(aptos);
}

export async function listarContratosComSaldoParaVinculo(
  clienteNome: string
): Promise<{
  comSaldo: ContratoAptoAgendamento[];
  semSaldo: ContratoAptoAgendamento[];
}> {
  const aptos = await listarContratosAptosParaAgendamento(clienteNome);
  return {
    comSaldo: aptos.filter((c) => c.disponiveis > 0),
    semSaldo: aptos.filter((c) => c.disponiveis <= 0 && c.contratados > 0),
  };
}

export async function resolverConsomeSaldoAoVincular(params: {
  contratoId: string;
  colaboradorCpf: string;
  ignorarAgendamentoId?: string | null;
}): Promise<boolean> {
  const rows = await fetchContagemRows([params.contratoId]);
  if (
    colaboradorJaConsomeSaldoNoContrato(
      rows,
      params.contratoId,
      params.colaboradorCpf,
      params.ignorarAgendamentoId
    )
  ) {
    return false;
  }
  return true;
}

export function filtrarAgendamentosConsumindoSaldo(
  agendamentos: AgendamentoWithExames[],
  contratoId: string
): AgendamentoWithExames[] {
  return agendamentos.filter(
    (ag) =>
      ag.contrato_id === contratoId &&
      ag.status !== "cancelado" &&
      agendamentoConsomeSaldoContrato(ag)
  );
}
