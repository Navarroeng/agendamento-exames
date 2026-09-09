/**
 * Portal do Cliente — Agendamentos — service server-side.
 * Isolamento explícito por cliente_id (+ fallback por nome legado).
 * Cancelados e rascunhos nunca entram na consulta.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { formatEnderecoClinica } from "@/lib/agendamento-mensagem-clinica";
import { todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import {
  PORTAL_AGENDAMENTO_STATUS_INCLUIDOS,
  agendamentoPertenceAoClientePortal,
  agendamentoToPortalDetalhe,
  agendamentoToPortalLinha,
  calcPortalAgendamentosResumo,
  type PortalAgendamentoDetalhe,
  type PortalAgendamentoLinha,
  type PortalAgendamentosResumo,
} from "@/lib/portal-agendamentos";
import type { AgendamentoWithExames } from "@/lib/types";

const AGENDAMENTO_SELECT_LISTAGEM = `
  id, data_agendamento, horario, colaborador, aso,
  clinica_nome, status, cliente_id, cliente_nome
`;

const AGENDAMENTO_SELECT_DETALHE = `
  id, data_agendamento, horario, colaborador, aso,
  clinica_nome, status, cliente_id, cliente_nome,
  agendamento_exames (
    id, tipo_exame
  )
`;

async function carregarAgendamentosVisiveisDoCliente(
  clienteId: string,
  clienteNome: string
): Promise<AgendamentoWithExames[]> {
  const admin = createAdminClient();

  const { data: porId, error: errId } = await admin
    .from("agendamentos")
    .select(AGENDAMENTO_SELECT_LISTAGEM)
    .eq("cliente_id", clienteId)
    .in("status", PORTAL_AGENDAMENTO_STATUS_INCLUIDOS)
    .order("data_agendamento", { ascending: true });

  if (errId) throw errId;

  let rows = (porId ?? []) as AgendamentoWithExames[];

  if (rows.length === 0 && clienteNome.trim()) {
    const { data: porNome, error: errNome } = await admin
      .from("agendamentos")
      .select(AGENDAMENTO_SELECT_LISTAGEM)
      .eq("cliente_nome", clienteNome.trim())
      .is("cliente_id", null)
      .in("status", PORTAL_AGENDAMENTO_STATUS_INCLUIDOS)
      .order("data_agendamento", { ascending: true });
    if (errNome) throw errNome;
    rows = (porNome ?? []) as AgendamentoWithExames[];
  }

  return rows.filter((ag) =>
    agendamentoPertenceAoClientePortal(ag, clienteId, clienteNome)
  );
}

export async function listarAgendamentosPortal(
  clienteId: string,
  clienteNome: string,
  agora: Date = new Date()
): Promise<{
  agendamentos: PortalAgendamentoLinha[];
  resumo: PortalAgendamentosResumo;
}> {
  const hojeIso = todayIsoSaoPaulo(agora);
  const rows = await carregarAgendamentosVisiveisDoCliente(
    clienteId,
    clienteNome
  );
  const linhas = rows
    .map((ag) => agendamentoToPortalLinha(ag, hojeIso))
    .filter((l): l is PortalAgendamentoLinha => Boolean(l));
  return {
    agendamentos: linhas,
    resumo: calcPortalAgendamentosResumo(linhas),
  };
}

export async function buscarAgendamentoPortalDetalhe(
  agendamentoId: string,
  clienteId: string,
  clienteNome: string,
  agora: Date = new Date()
): Promise<PortalAgendamentoDetalhe | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agendamentos")
    .select(AGENDAMENTO_SELECT_DETALHE)
    .eq("id", agendamentoId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const agendamento = data as AgendamentoWithExames;
  if (
    !agendamentoPertenceAoClientePortal(agendamento, clienteId, clienteNome)
  ) {
    return null;
  }
  if (
    !PORTAL_AGENDAMENTO_STATUS_INCLUIDOS.includes(
      agendamento.status as (typeof PORTAL_AGENDAMENTO_STATUS_INCLUIDOS)[number]
    )
  ) {
    return null;
  }

  let enderecoClinica: string | null = null;
  const clinicaNome = (agendamento.clinica_nome ?? "").trim();
  if (clinicaNome) {
    const { data: clinica } = await admin
      .from("clinicas")
      .select("rua, numero, bairro, cidade, estado, cep")
      .eq("nome", clinicaNome)
      .maybeSingle();
    if (clinica) {
      const endereco = formatEnderecoClinica({
        rua: String(clinica.rua ?? ""),
        numero: String(clinica.numero ?? ""),
        bairro: String(clinica.bairro ?? ""),
        cidade: String(clinica.cidade ?? ""),
        estado: String(clinica.estado ?? ""),
        cep: String(clinica.cep ?? ""),
      });
      enderecoClinica = endereco.trim() || null;
    }
  }

  return agendamentoToPortalDetalhe(agendamento, {
    hojeIso: todayIsoSaoPaulo(agora),
    enderecoClinica,
  });
}
