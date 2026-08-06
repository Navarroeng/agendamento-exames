import type { OrcamentoFormValues } from "@/lib/orcamento-types";

/** Snapshot estável para detectar alterações não salvas no formulário. */
export function serializeOrcamentoFormSnapshot(
  form: OrcamentoFormValues
): string {
  return JSON.stringify({
    numero: form.numero,
    data_proposta: form.data_proposta,
    cliente_id: form.cliente_id,
    cliente_nome: form.cliente_nome,
    cliente_cnpj: form.cliente_cnpj,
    cliente_endereco: form.cliente_endereco,
    cliente_setor: form.cliente_setor,
    contato: form.contato,
    email: form.email,
    telefone: form.telefone,
    observacoes: form.observacoes,
    forma_pagamento: form.forma_pagamento,
    quantidade_parcelas: form.quantidade_parcelas,
    origem_cliente: form.origem_cliente,
    itens: form.itens.map((item) => ({
      servico_id: item.servico_id,
      servico_nome: item.servico_nome,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      valor_total: item.valor_total,
    })),
  });
}

export function isOrcamentoFormDirty(
  form: OrcamentoFormValues,
  baseline: string | null
): boolean {
  if (!baseline) return false;
  return serializeOrcamentoFormSnapshot(form) !== baseline;
}
