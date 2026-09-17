/** Smoke test: aprovação comercial de orçamento (fluxo simplificado). */

import assert from "node:assert/strict";
import {
  buildAprovacaoDiffs,
  buildAprovacaoFormFromOrcamento,
  buildAprovacaoInsertPayload,
  buildCondicoesComerciaisFromForm,
  buildResumoComercialOrcamento,
  condicoesComerciaisMudaram,
  formatCondicaoAprovada,
  formatPagamentoFromCondicoes,
  resolveContratoAndamento,
  type OrcamentoAprovacaoRecord,
} from "../lib/orcamento-aprovacao";
import { parseMoney } from "../lib/money";
import type { OrcamentoComItens } from "../lib/orcamento-types";
import { SERVICO_AET_NOME } from "../lib/servico-aet";

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

const condicoesEdit = buildCondicoesComerciaisFromForm(
  {
    ...formAlterado,
    forma_pagamento: "avista",
    valor_final: "2.100,00",
    quantidade_colaboradores: "12",
    observacoes: "Ajuste comercial",
  },
  parseMoney
);
assert.equal(condicoesEdit.quantidade_colaboradores, 12);
assert.equal(condicoesEdit.valor_final, 2100);
assert.equal(condicoesEdit.condicao_pagamento, "À vista");
assert.equal(formatPagamentoFromCondicoes(condicoesEdit), "À vista · R$ 2.100,00");

const aprovacaoAntes = {
  quantidade_colaboradores: 10,
  valor_final: 2000,
  valor_avista: 1900,
  quantidade_parcelas: null,
  valor_parcela: null,
  condicao_pagamento: "À vista",
  observacoes: null,
} as OrcamentoAprovacaoRecord;
assert.equal(formatCondicaoAprovada(aprovacaoAntes), "À vista · R$ 1.900,00");
assert.equal(condicoesComerciaisMudaram(aprovacaoAntes, condicoesEdit), true);
assert.equal(
  condicoesComerciaisMudaram(aprovacaoAntes, {
    quantidade_colaboradores: 10,
    valor_final: 2000,
    condicao_pagamento: "À vista",
    quantidade_parcelas: null,
    valor_parcela: null,
    desconto_percentual: 0,
    valor_avista: 1900,
    observacoes: null,
  }),
  false
);

const orcamentoAet = {
  ...orcamento,
  modalidade: "pontual" as const,
  orcamento_itens: [
    {
      id: "iaet",
      orcamento_id: "o1",
      servico_id: "aet-1",
      servico_nome: SERVICO_AET_NOME,
      quantidade: 1,
      valor_unitario: 2800,
      valor_total: 2800,
      ordem: 0,
    },
  ],
  valor_total: 2800,
  subtotal: 2800,
} as OrcamentoComItens;
const resumoAet = buildResumoComercialOrcamento(orcamentoAet);
assert.equal(resumoAet.quantidadeColaboradores, 0);
assert.equal(resumoAet.valorAVista, 0);
assert.equal(resumoAet.textoAVista, "");
assert.equal(resumoAet.parcelas > 0, true);
const formAet = buildAprovacaoFormFromOrcamento(orcamentoAet);
assert.equal(formAet.forma_pagamento, "parcelado");
const payloadAet = buildAprovacaoInsertPayload(
  orcamentoAet,
  formAet,
  "Ágatha",
  parseMoney
);
assert.equal(payloadAet.quantidade_colaboradores, 0);
assert.equal(payloadAet.valor_avista, null);
assert.equal(payloadAet.desconto_percentual, 0);
assert.equal(payloadAet.quantidade_parcelas != null, true);
assert.equal(payloadAet.valor_parcela != null, true);
assert.doesNotMatch(payloadAet.condicao_pagamento ?? "", /vista/i);
assert.equal(payloadAet.itens[0]?.servico_id, "aet-1");
assert.equal(payloadAet.itens[0]?.servico_nome, SERVICO_AET_NOME);
const payloadAetAvistaIgnorado = buildAprovacaoInsertPayload(
  orcamentoAet,
  {
    ...formAet,
    condicoes_iguais: false,
    forma_pagamento: "avista",
    valor_final: "3.200,00",
    quantidade_parcelas: "2",
  },
  "Ágatha",
  parseMoney
);
assert.notEqual(payloadAetAvistaIgnorado.condicao_pagamento, "À vista");
assert.equal(payloadAetAvistaIgnorado.valor_avista, null);
assert.equal(payloadAetAvistaIgnorado.quantidade_parcelas, 2);
assert.equal(payloadAetAvistaIgnorado.valor_parcela, 1600);
assert.equal(payloadAetAvistaIgnorado.valor_final, 3200);
const diffsAet = buildAprovacaoDiffs(
  orcamentoAet,
  { ...formAet, condicoes_iguais: false, valor_final: "3.000,00" },
  parseMoney
);
assert.ok(!diffsAet.some((d) => d.label === "Quantidade de colaboradores"));
assert.ok(
  !diffsAet.some((d) => /vista/i.test(`${d.original} ${d.aprovado}`))
);
const condicoesAet = buildCondicoesComerciaisFromForm(
  {
    ...formAet,
    condicoes_iguais: false,
    forma_pagamento: "avista",
    valor_final: "3.000,00",
    quantidade_parcelas: "2",
  },
  parseMoney,
  "pontual",
  orcamentoAet.orcamento_itens
);
assert.equal(condicoesAet.quantidade_colaboradores, 0);
assert.equal(condicoesAet.valor_avista, null);
assert.equal(condicoesAet.quantidade_parcelas, 2);
const aprovacaoAetResidual = {
  quantidade_colaboradores: 0,
  valor_final: 2500,
  valor_avista: 2500,
  quantidade_parcelas: 1,
  valor_parcela: null,
  condicao_pagamento: "À vista",
  observacoes: null,
  orcamento_aprovacao_itens: [
    {
      id: "ai1",
      aprovacao_id: "ap1",
      servico_id: "aet-1",
      servico_nome: SERVICO_AET_NOME,
      quantidade: 1,
      valor_unitario: 2500,
      valor_total: 2500,
      ordem: 0,
    },
  ],
} as OrcamentoAprovacaoRecord;
assert.doesNotMatch(formatCondicaoAprovada(aprovacaoAetResidual), /vista/i);
assert.match(formatCondicaoAprovada(aprovacaoAetResidual), /1x de/);

console.log("test-orcamento-aprovacao: OK");
