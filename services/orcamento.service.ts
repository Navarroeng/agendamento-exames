import { createClient } from "@/lib/supabase/client";
import type {
  OrcamentoComItens,
  OrcamentoInsertPayload,
  OrcamentoRecord,
} from "@/lib/orcamento-types";

const ORCAMENTO_SELECT = `
  *,
  orcamento_itens (*)
`;

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
  const supabase = createClient();
  const numero =
    payload.numero.trim() || (await gerarNumeroOrcamento());

  const { data, error } = await supabase
    .from("orcamentos")
    .insert({
      numero,
      data_proposta: payload.data_proposta,
      cliente_id: payload.cliente_id,
      cliente_nome: payload.cliente_nome,
      contato: payload.contato,
      email: payload.email,
      telefone: payload.telefone,
      responsavel: payload.responsavel,
      observacoes: payload.observacoes,
      desconto_percentual: payload.desconto_percentual,
      forma_pagamento: payload.forma_pagamento,
      validade_proposta: payload.validade_proposta,
      subtotal: payload.subtotal,
      valor_total: payload.valor_total,
      status: payload.status,
    })
    .select("*")
    .single();

  if (error) throw error;

  const orcamento = data as OrcamentoRecord;
  await inserirItens(orcamento.id, payload.itens);

  const completo = await buscarOrcamentoComItens(orcamento.id);
  if (!completo) throw new Error("Orçamento não encontrado após criação.");
  return completo;
}

export async function atualizarOrcamento(
  id: string,
  payload: OrcamentoInsertPayload
): Promise<OrcamentoComItens> {
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from("orcamentos")
    .update({
      data_proposta: payload.data_proposta,
      cliente_id: payload.cliente_id,
      cliente_nome: payload.cliente_nome,
      contato: payload.contato,
      email: payload.email,
      telefone: payload.telefone,
      responsavel: payload.responsavel,
      observacoes: payload.observacoes,
      desconto_percentual: payload.desconto_percentual,
      forma_pagamento: payload.forma_pagamento,
      validade_proposta: payload.validade_proposta,
      subtotal: payload.subtotal,
      valor_total: payload.valor_total,
      status: payload.status,
    })
    .eq("id", id);

  if (updateError) throw updateError;

  const { error: deleteError } = await supabase
    .from("orcamento_itens")
    .delete()
    .eq("orcamento_id", id);

  if (deleteError) throw deleteError;

  await inserirItens(id, payload.itens);

  const completo = await buscarOrcamentoComItens(id);
  if (!completo) throw new Error("Orçamento não encontrado após atualização.");
  return completo;
}

export async function duplicarOrcamento(
  id: string
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
    contato: original.contato,
    email: original.email,
    telefone: original.telefone,
    responsavel: original.responsavel,
    observacoes: original.observacoes,
    desconto_percentual: Number(original.desconto_percentual),
    forma_pagamento: original.forma_pagamento,
    validade_proposta: original.validade_proposta,
    subtotal: Number(original.subtotal),
    valor_total: Number(original.valor_total),
    status: "em_elaboracao",
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

export async function excluirOrcamento(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("orcamentos").delete().eq("id", id);
  if (error) throw error;
}
