/**
 * Cadastro do colaborador compartilhado por Clientes e pela Lista de funcionários.
 * Atualiza os vínculos já existentes. Não cria vaga, exame, fatura nem cobrança.
 */

import { normalizeNomeOcupante } from "@/lib/contrato-vagas";
import {
  MENSAGEM_CPF_DUPLICADO,
  cadastroMudou,
  mensagemCpfDuplicadoNaEmpresa,
  registrosDoMesmoColaborador,
  type CadastroColaborador,
  type IdentidadeColaborador,
  type OrigemVinculoColaborador,
  type VinculoColaborador,
} from "@/lib/colaborador-cadastro";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import { lerPorIdentificadores, lerTodosOsLotes } from "@/lib/consulta-lotes";

type ErroPagina = { code?: string; message?: string } | null;

function paginaForaDoIntervalo(error: ErroPagina): boolean {
  if (!error) return false;
  if (error.code === "PGRST103") return true;
  return /range not satisfiable/i.test(String(error.message ?? ""));
}

export type SupabaseCadastro = {
  from: (table: string) => {
    select: (columns: string) => any;
    update: (values: Record<string, unknown>) => any;
  };
};

type Gravado = {
  tabela: string;
  id: string;
  anterior: Record<string, unknown>;
};

const TABELA: Record<OrigemVinculoColaborador, string> = {
  vaga: "contrato_vagas",
  agendamento: "agendamentos",
  periodico: "periodicos_futuros",
  movimentacao: "colaborador_movimentacoes",
};

function cpfGravado(value: string | null | undefined): string | null {
  const digits = normalizeCpfDigits(value);
  return isValidCPF(digits) ? digits : null;
}

function texto(value: string | null | undefined): string | null {
  const nome = normalizeNomeOcupante(value);
  return nome || null;
}

async function lerPaginas<T>(
  buscar: (
    from: number,
    to: number
  ) => Promise<{ data: T[] | null; error: ErroPagina }>
): Promise<T[]> {
  return lerTodosOsLotes(async (from, to) => {
    const { data, error } = await buscar(from, to);
    if (paginaForaDoIntervalo(error)) return [];
    if (error) throw error;
    return data ?? [];
  });
}

async function carregarVinculos(
  supabase: SupabaseCadastro,
  clienteId: string
): Promise<VinculoColaborador[]> {
  const contratos = await lerPaginas<{ id: string }>(async (from, to) => {
    const { data, error } = await supabase
      .from("cliente_contratos")
      .select("id")
      .eq("cliente_id", clienteId)
      .order("id", { ascending: true })
      .range(from, to);
    return { data, error };
  });
  const contratoIds = contratos.map((contrato) => contrato.id);

  const vagas = await lerPorIdentificadores(contratoIds, async (ids, from, to) => {
    const { data, error } = await supabase
      .from("contrato_vagas")
      .select("id, colaborador, colaborador_cpf, cargo_nome, agendamento_id")
      .in("contrato_id", ids)
      .order("id", { ascending: true })
      .range(from, to);
    if (paginaForaDoIntervalo(error)) return [];
    if (error) throw error;
    return data ?? [];
  });

  const periodicos = await lerPorIdentificadores(
    contratoIds,
    async (ids, from, to) => {
      const { data, error } = await supabase
        .from("periodicos_futuros")
        .select("id, colaborador, colaborador_cpf, cargo_nome")
        .in("contrato_id", ids)
        .order("id", { ascending: true })
        .range(from, to);
      if (paginaForaDoIntervalo(error)) return [];
      if (error) throw error;
      return data ?? [];
    }
  );

  const agendamentos = await lerPaginas<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("id, colaborador, colaborador_cpf, cargo_nome")
        .eq("cliente_id", clienteId)
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    }
  );

  let movimentacoes: Record<string, unknown>[] = [];
  try {
    movimentacoes = await lerPaginas<Record<string, unknown>>(async (from, to) => {
      const { data, error } = await supabase
        .from("colaborador_movimentacoes")
        .select(
          "id, cpf_digits, colaborador_nome, cargo_nome, vinculo_agendamento_id, vinculo_vaga_id"
        )
        .eq("cliente_id", clienteId)
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error };
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const message = String(err.message ?? "");
    if (
      err.code !== "42703" &&
      err.code !== "PGRST204" &&
      !/vinculo_agendamento_id|vinculo_vaga_id/i.test(message)
    ) {
      throw error;
    }
    movimentacoes = await lerPaginas<Record<string, unknown>>(async (from, to) => {
      const { data, error: semVinculo } = await supabase
        .from("colaborador_movimentacoes")
        .select("id, cpf_digits, colaborador_nome, cargo_nome")
        .eq("cliente_id", clienteId)
        .order("id", { ascending: true })
        .range(from, to);
      return { data, error: semVinculo };
    });
  }

  const registros: VinculoColaborador[] = [];
  for (const row of vagas as Record<string, unknown>[]) {
    registros.push({
      id: String(row.id),
      origem: "vaga",
      cpf: cpfGravado(row.colaborador_cpf as string | null),
      nome: texto(row.colaborador as string | null),
      cargo: texto(row.cargo_nome as string | null),
      agendamentoId: String(row.agendamento_id ?? "").trim() || null,
      vagaId: null,
    });
  }
  for (const row of agendamentos) {
    registros.push({
      id: String(row.id),
      origem: "agendamento",
      cpf: cpfGravado(row.colaborador_cpf as string | null),
      nome: texto(row.colaborador as string | null),
      cargo: texto(row.cargo_nome as string | null),
      agendamentoId: null,
      vagaId: null,
    });
  }
  for (const row of periodicos as Record<string, unknown>[]) {
    registros.push({
      id: String(row.id),
      origem: "periodico",
      cpf: cpfGravado(row.colaborador_cpf as string | null),
      nome: texto(row.colaborador as string | null),
      cargo: texto(row.cargo_nome as string | null),
      agendamentoId: null,
      vagaId: null,
    });
  }
  for (const row of movimentacoes) {
    registros.push({
      id: String(row.id),
      origem: "movimentacao",
      cpf: cpfGravado(row.cpf_digits as string | null),
      nome: texto(row.colaborador_nome as string | null),
      cargo: texto(row.cargo_nome as string | null),
      agendamentoId: String(row.vinculo_agendamento_id ?? "").trim() || null,
      vagaId: String(row.vinculo_vaga_id ?? "").trim() || null,
    });
  }
  return registros;
}

function patchDoRegistro(
  registro: VinculoColaborador,
  cadastro: CadastroColaborador
): { patch: Record<string, unknown>; anterior: Record<string, unknown> } | null {
  const nome = texto(cadastro.nome);
  const cargo = texto(cadastro.cargo);
  const cpf = cpfGravado(cadastro.cpf);
  if (registro.origem === "movimentacao") {
    const patch: Record<string, unknown> = {};
    const anterior: Record<string, unknown> = {};
    if (nome !== registro.nome) {
      patch.colaborador_nome = nome;
      anterior.colaborador_nome = registro.nome;
    }
    if (cargo !== registro.cargo) {
      patch.cargo_nome = cargo;
      anterior.cargo_nome = registro.cargo;
    }
    if (cpf && cpf !== registro.cpf) {
      patch.cpf_digits = cpf;
      anterior.cpf_digits = registro.cpf ?? "";
    }
    return Object.keys(patch).length > 0 ? { patch, anterior } : null;
  }

  const patch: Record<string, unknown> = {};
  const anterior: Record<string, unknown> = {};
  if (nome !== registro.nome) {
    patch.colaborador = nome;
    anterior.colaborador = registro.nome;
  }
  if (cargo !== registro.cargo) {
    patch.cargo_nome = cargo;
    anterior.cargo_nome = registro.cargo;
  }
  const cpfAtual = registro.cpf;
  const cpfDestino = cpf ?? cpfAtual;
  if (cpfDestino !== cpfAtual) {
    patch.colaborador_cpf = cpfDestino;
    anterior.colaborador_cpf = cpfAtual;
  }
  return Object.keys(patch).length > 0 ? { patch, anterior } : null;
}

function erroDeCpf(error: { code?: string; message?: string }): Error | null {
  const message = String(error.message ?? "");
  if (message.includes("idx_contrato_vagas_cpf")) {
    return new Error("Este CPF já está associado a outra vaga deste contrato.");
  }
  if (error.code === "23505") return new Error(MENSAGEM_CPF_DUPLICADO);
  return null;
}

async function aplicarCadastro(
  supabase: SupabaseCadastro,
  registros: VinculoColaborador[],
  identidade: IdentidadeColaborador,
  cadastro: CadastroColaborador
): Promise<void> {
  const conflito = mensagemCpfDuplicadoNaEmpresa(registros, identidade, cadastro.cpf);
  if (conflito) throw new Error(conflito);

  const alvos = registrosDoMesmoColaborador(registros, identidade);
  if (alvos.length === 0) {
    throw new Error("Colaborador não encontrado nesta empresa.");
  }

  const feitos: Gravado[] = [];
  try {
    for (const registro of alvos) {
      const mudanca = patchDoRegistro(registro, cadastro);
      if (!mudanca) continue;
      const { error } = await supabase
        .from(TABELA[registro.origem])
        .update(mudanca.patch)
        .eq("id", registro.id);
      if (error) throw erroDeCpf(error) ?? error;
      feitos.push({
        tabela: TABELA[registro.origem],
        id: registro.id,
        anterior: mudanca.anterior,
      });
    }
  } catch (error) {
    for (const feito of feitos.reverse()) {
      await supabase
        .from(feito.tabela)
        .update(feito.anterior)
        .eq("id", feito.id);
    }
    throw error;
  }
}

export async function propagarCadastroColaborador(
  supabase: SupabaseCadastro,
  params: {
    clienteId: string;
    identidade: IdentidadeColaborador;
    cadastro: CadastroColaborador;
  }
): Promise<void> {
  const clienteId = params.clienteId.trim();
  if (!clienteId) return;
  if (
    !cadastroMudou(
      { nome: null, cpf: params.identidade.cpf, cargo: null },
      { nome: params.cadastro.nome, cpf: params.cadastro.cpf, cargo: params.cadastro.cargo }
    ) &&
    !texto(params.cadastro.nome)
  ) {
    return;
  }
  const registros = await carregarVinculos(supabase, clienteId);
  await aplicarCadastro(
    supabase,
    registros,
    params.identidade,
    params.cadastro
  );
}

