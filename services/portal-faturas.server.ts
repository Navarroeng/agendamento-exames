/**
 * Portal do Cliente — Faturas — service server-side.
 * Usa createAdminClient para bypass RLS com isolamento explícito por cliente.
 * NUNCA retorna faturas de outro cliente.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  faturaComItensToPortalDetalhe,
  faturaPertencesseAoCliente,
  faturaToPortalLinha,
  calcPortalFaturasResumo,
  PORTAL_FATURA_STATUS_INCLUIDOS,
  type PortalFaturaDetalhe,
  type PortalFaturaLinha,
  type PortalFaturasResumo,
} from "@/lib/portal-faturas";
import type { FaturaComItens, FaturaRecord } from "@/lib/types";

const FATURA_SELECT_LISTAGEM = `
  id, numero, tipo, referencia_id, referencia_nome,
  mes_referencia, periodo_inicio, periodo_fim,
  data_emissao, data_vencimento,
  valor_total, total_exames, status,
  pago, data_pagamento,
  created_at, updated_at
`;

const FATURA_SELECT_DETALHE = `
  id, numero, tipo, referencia_id, referencia_nome,
  mes_referencia, periodo_inicio, periodo_fim,
  data_emissao, data_vencimento,
  valor_total, total_exames, status,
  pago, data_pagamento, observacao_pagamento,
  created_at, updated_at,
  fatura_itens (
    id, fatura_id, agendamento_id,
    data_agendamento, colaborador, cliente_nome, clinica_nome,
    tipo_aso, exame_nome,
    valor_unitario, quantidade, valor_total
  )
`;

/**
 * Busca faturas do cliente para o portal.
 * Filtra por referencia_id (UUID) quando disponível; fallback por referencia_nome.
 * Sempre exclui rascunhos.
 */
export async function listarFaturasPortal(
  clienteId: string,
  clienteNome: string,
  dataReferencia: Date = new Date()
): Promise<{
  faturas: PortalFaturaLinha[];
  resumo: PortalFaturasResumo;
}> {
  const admin = createAdminClient();

  // Consulta por referencia_id (campo UUID — mais seguro)
  const { data: porId, error: errId } = await admin
    .from("faturas")
    .select(FATURA_SELECT_LISTAGEM)
    .eq("tipo", "cliente")
    .eq("referencia_id", clienteId)
    .in("status", PORTAL_FATURA_STATUS_INCLUIDOS)
    .order("data_vencimento", { ascending: false });

  if (errId) throw errId;

  let rows = (porId ?? []) as FaturaRecord[];

  // Se não encontrou por ID, tenta por nome (clientes sem referencia_id ainda)
  if (rows.length === 0) {
    const { data: porNome, error: errNome } = await admin
      .from("faturas")
      .select(FATURA_SELECT_LISTAGEM)
      .eq("tipo", "cliente")
      .eq("referencia_nome", clienteNome)
      .is("referencia_id", null)
      .in("status", PORTAL_FATURA_STATUS_INCLUIDOS)
      .order("data_vencimento", { ascending: false });

    if (errNome) throw errNome;
    rows = (porNome ?? []) as FaturaRecord[];
  }

  // Segunda validação de isolamento (defesa em profundidade)
  const filtradas = rows.filter((f) =>
    faturaPertencesseAoCliente(f, clienteId, clienteNome)
  );

  const linhas = filtradas.map((f) => faturaToPortalLinha(f, dataReferencia));
  const resumo = calcPortalFaturasResumo(filtradas, dataReferencia);

  return { faturas: linhas, resumo };
}

/**
 * Busca o detalhe de uma fatura com itens, validando pertencimento ao cliente.
 * Retorna null se a fatura não pertencer ao cliente — nunca lança erro de acesso.
 */
export async function buscarFaturaPortalDetalhe(
  faturaId: string,
  clienteId: string,
  clienteNome: string,
  dataReferencia: Date = new Date()
): Promise<PortalFaturaDetalhe | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("faturas")
    .select(FATURA_SELECT_DETALHE)
    .eq("id", faturaId)
    .eq("tipo", "cliente")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const fatura = data as FaturaComItens;

  // Validação de pertencimento: garante que clienteA não acessa fatura de clienteB
  if (!faturaPertencesseAoCliente(fatura, clienteId, clienteNome)) {
    return null;
  }

  // Só mostrar se está em status incluído (excluir rascunhos)
  if (!PORTAL_FATURA_STATUS_INCLUIDOS.includes(fatura.status)) {
    return null;
  }

  return faturaComItensToPortalDetalhe(fatura, dataReferencia);
}
