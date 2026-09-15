/** Smoke test: modalidade Mensalidade nunca exibe total anual (× 12). */

import assert from "node:assert/strict";
import { getEmptyOrcamentoForm } from "../lib/orcamento-defaults";
import { formatCurrency, parseMoney } from "../lib/money";
import {
  GESTAO_COMPLETA_SST_ITENS,
  GESTAO_SST_MENSAL_NOME,
  ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO,
  ORCAMENTO_MENSALIDADE_MESES,
  ORCAMENTO_MODALIDADE_MENSALIDADE,
  ORCAMENTO_MODALIDADE_PONTUAL,
  buildResumoMensalidadeLinhas,
  filterServicosPorModalidade,
  formatValorMensalidade,
  formatValorOrcamentoExibicao,
  isGestaoMensalSstNome,
  isOrcamentoMensalidade,
  labelItensInclusosServico,
  labelValorColunaOrcamento,
  resolveModalidadePorServicoNome,
  resolveOrcamentoModalidade,
} from "../lib/orcamento-modalidade";
import {
  buildAprovacaoInsertPayload,
  buildResumoComercialOrcamento,
  formatCondicaoAprovada,
} from "../lib/orcamento-aprovacao";
import { resolveItensInclusosServico } from "../lib/servico-sst-pacote";
import type { OrcamentoComItens } from "../lib/orcamento-types";

const VALOR_MENSAL = 180;
const TOTAL_ANUAL_PROIBIDO = VALOR_MENSAL * ORCAMENTO_MENSALIDADE_MESES;
const TOTAL_ANUAL_TEXTO = formatCurrency(TOTAL_ANUAL_PROIBIDO);

function assertNaoVazaTotalAnual(texto: string, contexto: string) {
  assert.ok(
    !texto.includes(TOTAL_ANUAL_TEXTO),
    `${contexto} não pode conter ${TOTAL_ANUAL_TEXTO}`
  );
  assert.ok(
    !texto.includes("2.160"),
    `${contexto} não pode conter 2.160`
  );
  assert.ok(
    !texto.includes("2160"),
    `${contexto} não pode conter 2160`
  );
}

assert.equal(resolveOrcamentoModalidade(null), ORCAMENTO_MODALIDADE_PONTUAL);
assert.equal(resolveOrcamentoModalidade(undefined), ORCAMENTO_MODALIDADE_PONTUAL);
assert.equal(resolveOrcamentoModalidade("pontual"), ORCAMENTO_MODALIDADE_PONTUAL);
assert.equal(
  resolveOrcamentoModalidade("mensalidade"),
  ORCAMENTO_MODALIDADE_MENSALIDADE
);
assert.equal(isOrcamentoMensalidade(null), false);
assert.equal(isOrcamentoMensalidade("mensalidade"), true);

assert.equal(getEmptyOrcamentoForm().modalidade, ORCAMENTO_MODALIDADE_PONTUAL);

assert.equal(isGestaoMensalSstNome("Gestão SST - Mensal"), true);
assert.equal(isGestaoMensalSstNome("Gestão SST Mensal"), true);
assert.equal(isGestaoMensalSstNome("Gestão Completa SST"), true);
assert.equal(isGestaoMensalSstNome("Pacote completo - SST"), false);
assert.equal(
  resolveModalidadePorServicoNome("Gestão SST - Mensal"),
  ORCAMENTO_MODALIDADE_MENSALIDADE
);
assert.equal(
  resolveModalidadePorServicoNome("Pacote completo - SST"),
  ORCAMENTO_MODALIDADE_PONTUAL
);

const servicos = [
  { id: "1", nome: "Pacote completo - SST" },
  { id: "2", nome: GESTAO_SST_MENSAL_NOME },
  { id: "3", nome: "PCMSO" },
  { id: "4", nome: "Gestão Completa SST" },
];
assert.deepEqual(
  filterServicosPorModalidade(servicos, "pontual").map((s) => s.nome),
  ["Pacote completo - SST", GESTAO_SST_MENSAL_NOME, "PCMSO"]
);
assert.deepEqual(
  filterServicosPorModalidade(servicos, "mensalidade").map((s) => s.nome),
  ["Pacote completo - SST", GESTAO_SST_MENSAL_NOME, "PCMSO"]
);

assert.deepEqual(
  resolveItensInclusosServico({ nome: "Gestão SST - Mensal" }),
  [...GESTAO_COMPLETA_SST_ITENS]
);
assert.equal(
  labelItensInclusosServico("Gestão SST - Mensal"),
  "Essa gestão inclui:"
);
assert.equal(labelValorColunaOrcamento("mensalidade"), "Valor mensal");
assert.equal(labelValorColunaOrcamento("pontual"), "Valor");
assert.equal(
  labelItensInclusosServico("Pacote completo - SST"),
  "Este pacote inclui:"
);

assert.equal(formatValorMensalidade(VALOR_MENSAL), "R$ 180,00 / mês");
assert.equal(formatValorMensalidade(4200), "R$ 4.200,00 / mês");
assert.ok(
  !formatValorMensalidade(4200).includes("350"),
  "não converter valor sugerido anual em mensalidade por divisão automática"
);
assert.equal(
  formatValorOrcamentoExibicao({
    modalidade: "mensalidade",
    valor_total: VALOR_MENSAL,
  }),
  "R$ 180,00 / mês"
);
assert.equal(
  formatValorOrcamentoExibicao({
    modalidade: "pontual",
    valor_total: VALOR_MENSAL,
  }),
  formatCurrency(VALOR_MENSAL)
);

const linhas = buildResumoMensalidadeLinhas(VALOR_MENSAL);
const textoLinhas = linhas.map((l) => `${l.label} ${l.value}`).join(" | ");
assert.ok(linhas.some((l) => l.label === "Valor da mensalidade"));
assert.ok(linhas.some((l) => l.value === "R$ 180,00 / mês"));
assert.ok(
  linhas.some((l) => l.value === ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO)
);
assertNaoVazaTotalAnual(textoLinhas, "resumo mensalidade");
assert.ok(!textoLinhas.toLowerCase().includes("valor total"));
assert.ok(!textoLinhas.toLowerCase().includes("à vista"));
assert.ok(!textoLinhas.includes("12x de"));

const orcamentoMensalidade = {
  id: "m1",
  numero: "ORC-2026-0099",
  data_proposta: "2026-09-15",
  cliente_id: null,
  cliente_nome: "EMPRESA MENSAL",
  cliente_cnpj: null,
  cliente_endereco: null,
  cliente_setor: null,
  contato: null,
  email: null,
  telefone: null,
  responsavel: "AGATHA",
  origem_cliente: "indicacao",
  modalidade: ORCAMENTO_MODALIDADE_MENSALIDADE,
  observacoes: null,
  motivo_cancelamento: null,
  observacao_cancelamento: null,
  cancelado_em: null,
  cancelado_por: null,
  desconto_percentual: 0,
  forma_pagamento: null,
  quantidade_parcelas: null,
  validade_proposta: null,
  subtotal: VALOR_MENSAL,
  valor_total: VALOR_MENSAL,
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
      orcamento_id: "m1",
      servico_id: "2",
      servico_nome: GESTAO_SST_MENSAL_NOME,
      quantidade: 8,
      valor_unitario: VALOR_MENSAL,
      valor_total: VALOR_MENSAL,
      ordem: 0,
    },
  ],
} as OrcamentoComItens;

const resumo = buildResumoComercialOrcamento(orcamentoMensalidade);
assert.equal(resumo.valorTotal, VALOR_MENSAL);
assert.equal(resumo.valorAVista, 0);
assert.equal(resumo.textoAVista, "");
assert.equal(resumo.textoParcelado, ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO);
assertNaoVazaTotalAnual(JSON.stringify(resumo), "resumo comercial");

const payloadIguais = buildAprovacaoInsertPayload(
  orcamentoMensalidade,
  {
    condicoes_iguais: true,
    forma_pagamento: "parcelado",
    quantidade_colaboradores: "8",
    valor_final: "180,00",
    quantidade_parcelas: "12",
    observacoes: "",
  },
  "Ágatha",
  parseMoney
);
assert.equal(payloadIguais.valor_final, VALOR_MENSAL);
assert.equal(payloadIguais.desconto_percentual, 0);
assert.equal(payloadIguais.valor_avista, null);
assert.equal(payloadIguais.quantidade_parcelas, null);
assert.equal(
  payloadIguais.condicao_pagamento,
  ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO
);
assertNaoVazaTotalAnual(JSON.stringify(payloadIguais), "aprovação iguais");

const payloadEditado = buildAprovacaoInsertPayload(
  orcamentoMensalidade,
  {
    condicoes_iguais: false,
    forma_pagamento: "avista",
    quantidade_colaboradores: "10",
    valor_final: "200,00",
    quantidade_parcelas: "3",
    observacoes: "",
  },
  "Ágatha",
  parseMoney
);
assert.equal(payloadEditado.valor_final, 200);
assert.equal(payloadEditado.valor_avista, null);
assert.equal(payloadEditado.quantidade_parcelas, null);
assert.equal(
  payloadEditado.condicao_pagamento,
  ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO
);
assertNaoVazaTotalAnual(JSON.stringify(payloadEditado), "aprovação editada");

assert.equal(
  formatCondicaoAprovada({
    ...payloadIguais,
    id: "a1",
    orcamento_id: "m1",
    aprovado_por: "Ágatha",
    aprovado_em: "",
    contrato_enviado: false,
    contrato_enviado_em: null,
    contrato_assinado: false,
    contrato_assinado_em: null,
    observacao_contrato: null,
    boleto_vencimento: null,
    boleto_pago: false,
    boleto_pago_em: null,
    comprovante_path: null,
    comprovante_nome: null,
    comprovante_tipo: null,
    comprovante_tamanho: null,
    observacao_pagamento: null,
    created_at: "",
    updated_at: "",
  }),
  ORCAMENTO_MENSALIDADE_CONDICAO_PAGAMENTO
);

const orcamentoPontual = {
  ...orcamentoMensalidade,
  id: "p1",
  modalidade: ORCAMENTO_MODALIDADE_PONTUAL,
  subtotal: 2000,
  valor_total: 2000,
  quantidade_parcelas: 4,
  orcamento_itens: [
    {
      id: "i2",
      orcamento_id: "p1",
      servico_id: "3",
      servico_nome: "PCMSO",
      quantidade: 10,
      valor_unitario: 2000,
      valor_total: 2000,
      ordem: 0,
    },
  ],
} as OrcamentoComItens;

const resumoPontual = buildResumoComercialOrcamento(orcamentoPontual);
assert.equal(resumoPontual.valorTotal, 2000);
assert.ok(resumoPontual.valorAVista > 0);
assert.match(resumoPontual.textoParcelado, /4x de/);
assert.equal(
  formatValorOrcamentoExibicao(orcamentoPontual),
  formatCurrency(2000)
);

console.log("test-orcamento-modalidade: OK");
