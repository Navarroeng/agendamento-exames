/** Smoke test: aprovação comercial de orçamento (diffs + andamento). */

import assert from "node:assert/strict";
import {
  buildAprovacaoDiffs,
  buildAprovacaoFormFromOrcamento,
  buildAprovacaoInsertPayload,
  resolveContratoAndamento,
} from "../lib/orcamento-aprovacao";
import { parseMoney } from "../lib/money";
import type { OrcamentoComItens } from "../lib/orcamento-types";

const orcamento = {
  id: "o1",
  numero: "ORC-2026-0004",
  data_proposta: "2026-07-28",
  cliente_id: null,
  cliente_nome: "ACME",
  cliente_cnpj: null,
  cliente_endereco: null,
  cliente_setor: null,
  contato: null,
  email: null,
  telefone: null,
  responsavel: "AGATHA",
  origem_cliente: "indicacao",
  observacoes: null,
  motivo_cancelamento: null,
  observacao_cancelamento: null,
  cancelado_em: null,
  cancelado_por: null,
  desconto_percentual: 0,
  forma_pagamento: null,
  validade_proposta: null,
  subtotal: 2000,
  valor_total: 2000,
  status: "enviado" as const,
  assinatura_status: "nao_aplicavel" as const,
  assinatura_token: null,
  aceite_em: null,
  aceite_ip: null,
  aceite_usuario_nome: null,
  link_aceite_expira_em: null,
  created_at: "",
  updated_at: "",
  orcamento_itens: [
    {
      id: "i1",
      orcamento_id: "o1",
      servico_id: null,
      servico_nome: "PCMSO",
      quantidade: 10,
      valor_unitario: 200,
      valor_total: 2000,
      ordem: 0,
    },
  ],
} as OrcamentoComItens;

const form = buildAprovacaoFormFromOrcamento(orcamento);
form.quantidade_colaboradores = "15";
form.valor_final = "2.500,00";
form.quantidade_parcelas = "5";
form.valor_parcela = "500,00";

const diffs = buildAprovacaoDiffs(orcamento, form, parseMoney);
assert.ok(diffs.some((d) => d.label === "Valor" && d.changed));
assert.ok(
  diffs.some((d) => d.label === "Quantidade de colaboradores" && d.changed)
);

const payload = buildAprovacaoInsertPayload(form, "Ágatha", parseMoney);
assert.equal(payload.valor_final, 2500);
assert.equal(payload.quantidade_colaboradores, 15);
assert.equal(payload.aprovado_por, "Ágatha");

assert.equal(resolveContratoAndamento(null), "nao_enviado");
assert.equal(
  resolveContratoAndamento({
    contrato_enviado: true,
    contrato_assinado: false,
    boleto_pago: false,
    boleto_vencimento: null,
  }),
  "enviado"
);
assert.equal(
  resolveContratoAndamento({
    contrato_enviado: true,
    contrato_assinado: true,
    boleto_pago: false,
    boleto_vencimento: null,
  }),
  "assinado"
);
assert.equal(
  resolveContratoAndamento({
    contrato_enviado: true,
    contrato_assinado: true,
    boleto_pago: false,
    boleto_vencimento: "2026-08-20",
  }),
  "aguardando_pagamento"
);
assert.equal(
  resolveContratoAndamento({
    contrato_enviado: true,
    contrato_assinado: true,
    boleto_pago: true,
    boleto_vencimento: "2026-08-20",
  }),
  "pago"
);

console.log("test-orcamento-aprovacao: OK");
