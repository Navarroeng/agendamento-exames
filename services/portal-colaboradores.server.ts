/**
 * Portal — Colaboradores (server-only).
 * Isolamento por cliente_id + contrato atual (contrato_vagas) +
 * agendamentos + colaborador_movimentacoes.
 */

import { lerTodosOsLotes } from "@/lib/consulta-lotes";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContratoAtual } from "@/lib/cliente-contrato-mappers";
import {
  PORTAL_CONTRATO_SELECT,
  type PortalContratoFonte,
} from "@/lib/portal-contrato";
import {
  calcPortalColaboradoresResumo,
  consolidarPortalColaboradores,
  type ClienteColaboradorLinha,
  type PortalColaboradorAgendamentoFonte,
  type PortalColaboradorMovimentacaoFonte,
  type PortalColaboradorVagaFonte,
  type PortalColaboradoresResumo,
} from "@/lib/portal-colaboradores";
import type { ClienteContratoRecord } from "@/lib/types";

const VAGA_SELECT =
  "colaborador, colaborador_cpf, cargo_nome, status";

const AGENDAMENTO_SELECT = `
  id, colaborador, colaborador_cpf, cargo_nome, aso, status,
  data_agendamento, aso_retido_em, cliente_id
`;

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

  const contratosRaw = await lerTodosOsLotes(async (from, to) => {
    const { data, error } = await admin
      .from("cliente_contratos")
      .select(PORTAL_CONTRATO_SELECT)
      .eq("cliente_id", id)
      .order("aprovado_em", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return data ?? [];
  });

  const contratos = contratosRaw as unknown as PortalContratoFonte[];
  const contratoAtual = getContratoAtual(
    contratos as ClienteContratoRecord[]
  );

  let vagas: PortalColaboradorVagaFonte[] = [];
  if (contratoAtual?.id) {
    vagas = await lerTodosOsLotes(async (from, to) => {
      const { data, error } = await admin
        .from("contrato_vagas")
        .select(VAGA_SELECT)
        .eq("contrato_id", contratoAtual.id)
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as PortalColaboradorVagaFonte[];
    });
  }

  const agendamentos = await lerTodosOsLotes(async (from, to) => {
    const { data, error } = await admin
      .from("agendamentos")
      .select(AGENDAMENTO_SELECT)
      .eq("cliente_id", id)
      .in("status", ["agendado", "aso_retido"])
      .order("data_agendamento", { ascending: false })
      .order("id", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as PortalColaboradorAgendamentoFonte[];
  });

  const movimentacoes = await lerTodosOsLotes(async (from, to) => {
    const { data, error } = await admin
      .from("colaborador_movimentacoes")
      .select(
        "id, cpf_digits, tipo, data_evento, cancelado_em, colaborador_nome, cargo_nome, criado_em"
      )
      .eq("cliente_id", id)
      .in("tipo", ["desligamento_admin", "admissao"])
      .is("cancelado_em", null)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as PortalColaboradorMovimentacaoFonte[];
  });

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
