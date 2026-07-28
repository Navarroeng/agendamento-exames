/** Smoke test: aprovação comercial de orçamento (fluxo simplificado). */

import assert from "node:assert/strict";
import {
  buildAprovacaoDiffs,
  buildAprovacaoFormFromOrcamento,
  buildAprovacaoInsertPayload,
  buildResumoComercialOrcamento,
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

const resumo = buildResumoComercialOrcamento(orcamento);
assert.equal(resumo.quantidadeColaboradores, 10);
assert.equal(resumo.valorTotal, 2000);

const formIguais = buildAprovacaoFormFromOrcamento(orcamento);
assert.equal(formIguais.condicoes_iguais, true);
const payloadIguais = buildAprovacaoInsertPayload(
  orcamento,
  formIguais,
  "Ágatha",
  parseMoney
);
assert.equal(payloadIguais.valor_final, 2000);
assert.equal(payloadIguais.quantidade_colaboradores, 10);
assert.equal(payloadIguais.itens.length, 1);
assert.equal(buildAprovacaoDiffs(orcamento, formIguais, parseMoney).length, 0);

const formAlterado = {
  ...formIguais,
  condicoes_iguais: false,
  forma_pagamento: "parcelado" as const,
  quantidade_colaboradores: "15",
  valor_final: "2.500,00",
  quantidade_parcelas: "5",
};
const diffs = buildAprovacaoDiffs(orcamento, formAlterado, parseMoney);
assert.ok(diffs.some((d) => d.label === "Valor" && d.changed));
assert.ok(
  diffs.some((d) => d.label === "Quantidade de colaboradores" && d.changed)
);

const payload = buildAprovacaoInsertPayload(
  orcamento,
  formAlterado,
  "Ágatha",
  parseMoney
);
assert.equal(payload.valor_final, 2500);
assert.equal(payload.quantidade_colaboradores, 15);
assert.equal(payload.quantidade_parcelas, 5);
assert.equal(payload.valor_parcela, 500);
assert.equal(payload.condicao_pagamento, "5x de R$ 500,00");
assert.equal(payload.aprovado_por, "Ágatha");

const payloadAvista = buildAprovacaoInsertPayload(
  orcamento,
  {
    ...formAlterado,
    forma_pagamento: "avista",
    valor_final: "2.375,00",
  },
  "Ágatha",
  parseMoney
);
assert.equal(payloadAvista.condicao_pagamento, "À vista");
assert.equal(payloadAvista.valor_avista, 2375);
assert.equal(payloadAvista.quantidade_parcelas, null);

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

console.log("test-orcamento-aprovacao: OK");
