import { createClient } from "@/lib/supabase/client";
import { calcValidadePropostaIso } from "@/lib/orcamento-validade";
import type {
  OrcamentoComItens,
  OrcamentoInsertPayload,
  OrcamentoRecord,
} from "@/lib/orcamento-types";

const ORCAMENTO_SELECT = `
  *,
  orcamento_itens (*)
`;

function normalizeOrcamentoPayload(
  payload: OrcamentoInsertPayload
): OrcamentoInsertPayload {
  return {
    ...payload,
    desconto_percentual: 0,
    validade_proposta: calcValidadePropostaIso(payload.data_proposta),
    valor_total: payload.subtotal,
  };
}

function sortItens(orcamento: OrcamentoComItens): OrcamentoComItens {
  return {
    ...orcamento,
    orcamento_itens: [...(orcamento.orcamento_itens ?? [])].sort(
      (a, b) => a.ordem - b.ordem
    ),
  };
}

export async function gerarNumeroOrcamento(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("gerar_numero_orcamento");
  if (error) throw error;
  return String(data);
}

export async function listarOrcamentos(limit = 500): Promise<OrcamentoRecord[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .select("*")
    .order("data_proposta", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as OrcamentoRecord[];
}

export async function buscarOrcamentoComItens(
  id: string
): Promise<OrcamentoComItens | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .select(ORCAMENTO_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return sortItens(data as OrcamentoComItens);
}

async function inserirItens(
  orcamentoId: string,
  itens: OrcamentoInsertPayload["itens"]
): Promise<void> {
  if (itens.length === 0) return;

  const supabase = createClient();
  const rows = itens.map((item, index) => ({
    orcamento_id: orcamentoId,
    servico_id: item.servico_id,
    servico_nome: item.servico_nome,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario,
    valor_total: item.valor_total,
    ordem: item.ordem ?? index,
  }));

  const { error } = await supabase.from("orcamento_itens").insert(rows);
  if (error) throw error;
}

export async function criarOrcamento(
  payload: OrcamentoInsertPayload
): Promise<OrcamentoComItens> {
  const normalized = normalizeOrcamentoPayload(payload);
  const supabase = createClient();
  const numero =
    normalized.numero.trim() || (await gerarNumeroOrcamento());

  const { data, error } = await supabase
    .from("orcamentos")
    .insert({
      numero,
      data_proposta: normalized.data_proposta,
      cliente_id: normalized.cliente_id,
      cliente_nome: normalized.cliente_nome,
      cliente_cnpj: normalized.cliente_cnpj,
      cliente_endereco: normalized.cliente_endereco,
      cliente_setor: normalized.cliente_setor,
      contato: normalized.contato,
      email: normalized.email,
      telefone: normalized.telefone,
      responsavel: normalized.responsavel,
      criado_por: normalized.criado_por ?? normalized.responsavel,
      criado_por_user_id:
        normalized.criado_por_user_id ?? normalized.responsavel_user_id ?? null,
      responsavel_user_id: normalized.responsavel_user_id ?? null,
      origem_cliente: normalized.origem_cliente,
      observacoes: normalized.observacoes,
      desconto_percentual: normalized.desconto_percentual,
      forma_pagamento: normalized.forma_pagamento,
      validade_proposta: normalized.validade_proposta,
      subtotal: normalized.subtotal,
      valor_total: normalized.valor_total,
      status: "em_elaboracao",
    })
    .select("*")
    .single();

  if (error) throw error;

  const orcamento = data as OrcamentoRecord;
  await inserirItens(orcamento.id, normalized.itens);

  const completo = await buscarOrcamentoComItens(orcamento.id);
  if (!completo) throw new Error("Orçamento não encontrado após criação.");
  return completo;
}

export async function atualizarOrcamento(
  id: string,
  payload: OrcamentoInsertPayload
): Promise<OrcamentoComItens> {
  const normalized = normalizeOrcamentoPayload(payload);
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from("orcamentos")
    .update({
      data_proposta: normalized.data_proposta,
      cliente_id: normalized.cliente_id,
      cliente_nome: normalized.cliente_nome,
      cliente_cnpj: normalized.cliente_cnpj,
      cliente_endereco: normalized.cliente_endereco,
      cliente_setor: normalized.cliente_setor,
      contato: normalized.contato,
      email: normalized.email,
      telefone: normalized.telefone,
      origem_cliente: normalized.origem_cliente,
      observacoes: normalized.observacoes,
      desconto_percentual: normalized.desconto_percentual,
      forma_pagamento: normalized.forma_pagamento,
      validade_proposta: normalized.validade_proposta,
      subtotal: normalized.subtotal,
      valor_total: normalized.valor_total,
    })
    .eq("id", id);

  if (updateError) throw updateError;

  const { error: deleteError } = await supabase
    .from("orcamento_itens")
    .delete()
    .eq("orcamento_id", id);

  if (deleteError) throw deleteError;

  await inserirItens(id, normalized.itens);

  const completo = await buscarOrcamentoComItens(id);
  if (!completo) throw new Error("Orçamento não encontrado após atualização.");
  return completo;
}

export async function duplicarOrcamento(
  id: string,
  responsavel: string
): Promise<OrcamentoComItens> {
  const original = await buscarOrcamentoComItens(id);
  if (!original) throw new Error("Orçamento não encontrado.");

  const numero = await gerarNumeroOrcamento();
  const hoje = new Date().toISOString().split("T")[0];

  return criarOrcamento({
    numero,
    data_proposta: hoje,
    cliente_id: original.cliente_id,
    cliente_nome: original.cliente_nome,
    cliente_cnpj: original.cliente_cnpj,
    cliente_endereco: original.cliente_endereco,
    cliente_setor: original.cliente_setor,
    contato: original.contato,
    email: original.email,
    telefone: original.telefone,
    responsavel,
    origem_cliente: original.origem_cliente,
    observacoes: original.observacoes,
    desconto_percentual: 0,
    forma_pagamento: original.forma_pagamento,
    validade_proposta: calcValidadePropostaIso(hoje),
    subtotal: Number(original.subtotal),
    valor_total: Number(original.subtotal),
    itens: (original.orcamento_itens ?? []).map((item, index) => ({
      servico_id: item.servico_id,
      servico_nome: item.servico_nome,
      quantidade: Number(item.quantidade),
      valor_unitario: Number(item.valor_unitario),
      valor_total: Number(item.valor_total),
      ordem: index,
    })),
  });
}

/** Marca como Enviado quando ainda está em elaboração (ex.: gerar PDF). */
export async function marcarOrcamentoComoEnviado(
  id: string
): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orcamentos")
    .update({ status: "enviado" })
    .eq("id", id)
    .eq("status", "em_elaboracao")
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function excluirOrcamento(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("orcamentos").delete().eq("id", id);
  if (error) throw error;
}
