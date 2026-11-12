/**
 * Relação de colaboradores da empresa (portal e modal de Clientes).
 * Lê vagas de todos os contratos do cliente, agendamentos e
 * movimentações. Não grava vaga, exame, fatura nem eSocial.
 */

import {
  lerPorIdentificadores,
  lerTodosOsLotes,
} from "@/lib/consulta-lotes";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  calcPortalColaboradoresResumo,
  consolidarPortalColaboradores,
  montarHistoricoExamesColaborador,
  type ClienteColaboradorLinha,
  type HistoricoExameColaborador,
  type PortalColaboradorAgendamentoFonte,
  type PortalColaboradorMovimentacaoFonte,
  type PortalColaboradorVagaFonte,
  type PortalColaboradoresResumo,
} from "@/lib/portal-colaboradores";

const VAGA_SELECT =
  "id, colaborador, colaborador_cpf, cargo_nome, status, agendamento_id";
const VAGA_SELECT_ORIGEM = `${VAGA_SELECT}, colaborador_origem`;

const AGENDAMENTO_SELECT = `
  id, colaborador, colaborador_cpf, cargo_nome, aso, status,
  data_agendamento, aso_retido_em, cliente_id
`;

type ErroPagina = { code?: string; message?: string } | null;

/**
 * Página pedida depois da última linha. O PostgREST responde 416
 * (PGRST103) e, se isso virar exceção, a relação inteira falha.
 */
export function paginaForaDoIntervalo(error: ErroPagina): boolean {
  if (!error) return false;
  if (error.code === "PGRST103") return true;
  return /range not satisfiable/i.test(String(error.message ?? ""));
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

export async function listarColaboradoresPortal(clienteId: string): Promise<{
  colaboradores: ClienteColaboradorLinha[];
  resumo: PortalColaboradoresResumo;
}> {
  const id = clienteId.trim();
  if (!id) {
    return {
      colaboradores: [],
      resumo: calcPortalColaboradoresResumo([]),
    };
  }

  const admin = createAdminClient();

  const contratos = await lerPaginas<{ id: string }>(async (from, to) => {
    const { data, error } = await admin
      .from("cliente_contratos")
      .select("id")
      .eq("cliente_id", id)
      .order("id", { ascending: true })
      .range(from, to);
    return { data, error };
  });

  const lerVagas = (colunas: string) =>
    lerPorIdentificadores(
      contratos.map((contrato) => contrato.id),
      async (ids, from, to) => {
        const { data, error } = await admin
          .from("contrato_vagas")
          .select(colunas)
          .in("contrato_id", ids)
          .order("id", { ascending: true })
          .range(from, to);
        if (paginaForaDoIntervalo(error)) return [];
        if (error) throw error;
        return (data ?? []) as PortalColaboradorVagaFonte[];
      }
    );
  let vagas: PortalColaboradorVagaFonte[];
  try {
    vagas = await lerVagas(VAGA_SELECT_ORIGEM);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const message = String(err.message ?? "");
    if (
      err.code !== "42703" &&
      err.code !== "PGRST204" &&
      !/colaborador_origem/i.test(message)
    ) {
      throw error;
    }
    vagas = await lerVagas(VAGA_SELECT);
  }

  const agendamentos = await lerPaginas<PortalColaboradorAgendamentoFonte>(
    async (from, to) => {
      const { data, error } = await admin
        .from("agendamentos")
        .select(AGENDAMENTO_SELECT)
        .eq("cliente_id", id)
        .in("status", ["agendado", "aso_retido"])
        .order("data_agendamento", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      return {
        data: (data ?? null) as PortalColaboradorAgendamentoFonte[] | null,
        error,
      };
    }
  );

  const selectMovimentacao =
    "id, cpf_digits, tipo, data_evento, cancelado_em, colaborador_nome, cargo_nome, criado_em";
  const selectMovimentacaoVinculo = `${selectMovimentacao}, vinculo_agendamento_id, vinculo_vaga_id`;
  const selectMovimentacaoCadastro = `${selectMovimentacaoVinculo}, vinculo_cadastro_id`;
  const lerMovimentacoes = (colunas: string) =>
    lerPaginas<PortalColaboradorMovimentacaoFonte>(async (from, to) => {
      const { data, error } = await admin
        .from("colaborador_movimentacoes")
        .select(colunas)
        .eq("cliente_id", id)
        .in("tipo", ["desligamento_admin", "admissao", "cadastro"])
        .is("cancelado_em", null)
        .order("id", { ascending: true })
        .range(from, to);
      return {
        data: (data ?? null) as PortalColaboradorMovimentacaoFonte[] | null,
        error,
      };
    });
  let movimentacoes: PortalColaboradorMovimentacaoFonte[];
  try {
    movimentacoes = await lerMovimentacoes(selectMovimentacaoCadastro);
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const message = String(err.message ?? "");
    if (
      err.code !== "42703" &&
      err.code !== "PGRST204" &&
      !/vinculo_cadastro_id|vinculo_agendamento_id|vinculo_vaga_id/i.test(message)
    ) {
      throw error;
    }
    try {
      movimentacoes = await lerMovimentacoes(selectMovimentacaoVinculo);
    } catch (semCadastro) {
      const falha = semCadastro as { code?: string; message?: string };
      const detalhe = String(falha.message ?? "");
      if (
        falha.code !== "42703" &&
        falha.code !== "PGRST204" &&
        !/vinculo_agendamento_id|vinculo_vaga_id/i.test(detalhe)
      ) {
        throw semCadastro;
      }
      movimentacoes = await lerMovimentacoes(selectMovimentacao);
    }
  }

  const colaboradores = consolidarPortalColaboradores({
    vagas,
    agendamentos,
    movimentacoes,
  });

  return {
    colaboradores,
    resumo: calcPortalColaboradoresResumo(colaboradores),
  };
}

export async function listarHistoricoExamesColaborador(input: {
  clienteId: string;
  cpf?: string | null;
  agendamentoId?: string | null;
}): Promise<HistoricoExameColaborador[]> {
  const id = input.clienteId.trim();
  if (!id) return [];

  const admin = createAdminClient();
  const agendamentos = await lerPaginas<PortalColaboradorAgendamentoFonte>(
    async (from, to) => {
      const { data, error } = await admin
        .from("agendamentos")
        .select(AGENDAMENTO_SELECT)
        .eq("cliente_id", id)
        .in("status", ["agendado", "aso_retido"])
        .order("data_agendamento", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);
      return {
        data: (data ?? null) as PortalColaboradorAgendamentoFonte[] | null,
        error,
      };
    }
  );

  return montarHistoricoExamesColaborador({
    agendamentos,
    cpf: input.cpf,
    agendamentoId: input.agendamentoId,
  });
}
