/**
 * Portal — Colaboradores (server-only).
 * Isolamento por cliente_id + contrato atual (contrato_vagas) + agendamentos.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getContratoAtual } from "@/lib/cliente-contrato-mappers";
import {
  PORTAL_CONTRATO_SELECT,
  type PortalContratoFonte,
} from "@/lib/portal-contrato";
import {
  calcPortalColaboradoresResumo,
  consolidarPortalColaboradores,
  type PortalColaboradorAgendamentoFonte,
  type PortalColaboradorLinha,
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
  colaboradores: PortalColaboradorLinha[];
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

  const { data: contratosRaw, error: errContratos } = await admin
    .from("cliente_contratos")
    .select(PORTAL_CONTRATO_SELECT)
    .eq("cliente_id", id)
    .order("aprovado_em", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("data_inicio", { ascending: false });

  if (errContratos) throw errContratos;

  const contratos = (contratosRaw ?? []) as unknown as PortalContratoFonte[];
  const contratoAtual = getContratoAtual(
    contratos as ClienteContratoRecord[]
  );

  let vagas: PortalColaboradorVagaFonte[] = [];
  if (contratoAtual?.id) {
    const { data: vagasRaw, error: errVagas } = await admin
      .from("contrato_vagas")
      .select(VAGA_SELECT)
      .eq("contrato_id", contratoAtual.id);

    if (errVagas) throw errVagas;
    vagas = (vagasRaw ?? []) as PortalColaboradorVagaFonte[];
  }

  const { data: agsRaw, error: errAgs } = await admin
    .from("agendamentos")
    .select(AGENDAMENTO_SELECT)
    .eq("cliente_id", id)
    .in("status", ["agendado", "aso_retido"]);

  if (errAgs) throw errAgs;

  const agendamentos = (agsRaw ?? []) as PortalColaboradorAgendamentoFonte[];

  const colaboradores = consolidarPortalColaboradores({
    vagas,
    agendamentos,
  });

  return {
    colaboradores,
    resumo: calcPortalColaboradoresResumo(colaboradores),
  };
}
