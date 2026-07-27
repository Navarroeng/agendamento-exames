/** Testes: valor do orçamento não multiplica quantidade de colaboradores. */

import assert from "node:assert/strict";
import {
  calcSubtotalItens,
  calcValorTotalOrcamento,
  isLegacyItemValorMultiplicado,
  parseQuantidadeColaboradores,
  resolveItemValorForm,
  resolveItemValorParaFormulario,
  resolveItemValorServico,
  resolveQuantidadeColaboradoresOrcamento,
} from "../lib/orcamento-calculo";
import type { OrcamentoItemFormItem } from "../lib/orcamento-types";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";

function itemForm(
  partial: Partial<OrcamentoItemFormItem> &
    Pick<OrcamentoItemFormItem, "servico_nome">
): OrcamentoItemFormItem {
  return {
    id: partial.id ?? "1",
    servico_id: partial.servico_id ?? "s1",
    servico_nome: partial.servico_nome,
    quantidade: partial.quantidade ?? "1",
    valor_unitario: partial.valor_unitario ?? "",
    valor_total: partial.valor_total ?? "",
  };
}

assert.equal(parseQuantidadeColaboradores("2"), 2);
assert.equal(parseQuantidadeColaboradores("10"), 10);
assert.equal(parseQuantidadeColaboradores("0"), 0);

assert.ok(
  isLegacyItemValorMultiplicado({
    quantidade: 2,
    valor_unitario: 1500,
    valor_total: 3000,
  })
);

assert.equal(
  resolveItemValorServico({
    quantidade: 2,
    valor_unitario: 1500,
    valor_total: 3000,
  }),
  1500
);

assert.equal(
  resolveItemValorParaFormulario({
    id: "1",
    orcamento_id: "o1",
    servico_id: "s1",
    servico_nome: "Pacote",
    quantidade: 2,
    valor_unitario: 1500,
    valor_total: 3000,
    ordem: 0,
  }),
  1500
);

assert.equal(
  resolveItemValorServico({
    quantidade: 10,
    valor_unitario: 1500,
    valor_total: 1500,
  }),
  1500
);

const umServico = [
  itemForm({
    servico_nome: "Pacote completo - SST",
    quantidade: "2",
    valor_unitario: "1.500,00",
  }),
];
assert.equal(resolveItemValorForm(umServico[0]), 1500);
assert.equal(calcSubtotalItens(umServico), 1500);

const dezColaboradores = [
  itemForm({
    servico_nome: "Pacote completo - SST",
    quantidade: "10",
    valor_unitario: "1.500,00",
  }),
];
assert.equal(calcSubtotalItens(dezColaboradores), 1500);

const doisServicos = [
  itemForm({
    servico_nome: "Pacote completo - SST",
    quantidade: "2",
    valor_unitario: "1.500,00",
  }),
  itemForm({
    id: "2",
    servico_nome: "Treinamento NR",
    quantidade: "2",
    valor_unitario: "800,00",
  }),
];
assert.equal(calcSubtotalItens(doisServicos), 2300);

assert.equal(calcValorTotalOrcamento(2300, "10"), 2070);

assert.equal(
  resolveQuantidadeColaboradoresOrcamento({
    orcamento_itens: [
      {
        id: "1",
        orcamento_id: "o1",
        servico_id: null,
        servico_nome: PACOTE_COMPLETO_SST_NOME,
        quantidade: 2,
        valor_unitario: 1500,
        valor_total: 1500,
        ordem: 0,
      },
    ],
  }),
  2
);

console.log("test-orcamento-calculo: OK");
