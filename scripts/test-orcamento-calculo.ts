/** Testes: cálculo de orçamento e tabela Pacote completo - SST. */

import assert from "node:assert/strict";
import {
  applyPacoteCompletoSstPrecoItensPayload,
  calcSubtotalItens,
  calcValorPacoteCompletoSst,
  calcValorTotalOrcamento,
  isLegacyItemValorMultiplicado,
  isPacoteCompletoSstValorAutomatico,
  inferValorManualOrcamentoItem,
  isValorOrcamentoItemBloqueado,
  parseQuantidadeColaboradores,
  resolveItemValorForm,
  resolveItemValorParaFormulario,
  resolveItemValorServico,
  resolveQuantidadeColaboradoresOrcamento,
  validateOrcamentoItensValores,
  applyValorAutomaticoPacoteCompletoSstItem,
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
    valor_manual: partial.valor_manual ?? false,
  };
}

assert.equal(parseQuantidadeColaboradores("2"), 2);
assert.equal(parseQuantidadeColaboradores("10"), 10);
assert.equal(parseQuantidadeColaboradores("0"), 0);

assert.equal(calcValorPacoteCompletoSst(1), 1300);
assert.equal(calcValorPacoteCompletoSst(5), 1700);
assert.equal(calcValorPacoteCompletoSst(20), 3200);
assert.equal(calcValorPacoteCompletoSst(21), null);
assert.equal(calcValorPacoteCompletoSst(0), null);

assert.equal(
  isPacoteCompletoSstValorAutomatico(PACOTE_COMPLETO_SST_NOME, 5),
  true
);
assert.equal(
  isPacoteCompletoSstValorAutomatico(PACOTE_COMPLETO_SST_NOME, 21),
  false
);
assert.equal(isPacoteCompletoSstValorAutomatico("Treinamento NR", 5), false);
assert.equal(isValorOrcamentoItemBloqueado(PACOTE_COMPLETO_SST_NOME, "5"), false);
assert.equal(
  isValorOrcamentoItemBloqueado(PACOTE_COMPLETO_SST_NOME, "21"),
  false
);
assert.equal(isValorOrcamentoItemBloqueado("Treinamento NR", "5"), false);

const formAutoManual = applyValorAutomaticoPacoteCompletoSstItem({
  servico_nome: PACOTE_COMPLETO_SST_NOME,
  quantidade: "5",
  valor_unitario: "R$ 1.650,00",
  valor_total: "1650",
  valor_manual: true,
});
assert.equal(formAutoManual.valor_unitario, "R$ 1.650,00");
assert.equal(formAutoManual.valor_total, "1650");

assert.equal(inferValorManualOrcamentoItem(PACOTE_COMPLETO_SST_NOME, 6, 1650), true);
assert.equal(inferValorManualOrcamentoItem(PACOTE_COMPLETO_SST_NOME, 6, 1800), false);
assert.equal(inferValorManualOrcamentoItem("Treinamento NR", 5, 900), false);

const payloadManualPacote = applyPacoteCompletoSstPrecoItensPayload([
  {
    servico_nome: PACOTE_COMPLETO_SST_NOME,
    quantidade: 6,
    valor_unitario: 1650,
    valor_total: 1650,
    valor_manual: true,
  },
]);
assert.equal(payloadManualPacote[0].valor_unitario, 1650);
assert.equal(payloadManualPacote[0].valor_total, 1650);

assert.equal(
  validateOrcamentoItensValores([
    {
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 6,
      valor_unitario: 1650,
      valor_manual: true,
    },
  ]),
  null
);

assert.equal(
  validateOrcamentoItensValores([
    {
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 6,
      valor_unitario: 0,
      valor_manual: true,
    },
  ]),
  "Informe o valor negociado para o Pacote completo - SST."
);

const formAuto = applyValorAutomaticoPacoteCompletoSstItem({
  servico_nome: PACOTE_COMPLETO_SST_NOME,
  quantidade: "5",
  valor_unitario: "",
  valor_total: "",
});
assert.equal(formAuto.valor_unitario, "R$ 1.700,00");
assert.equal(formAuto.valor_total, "1700");

const formAcima20 = applyValorAutomaticoPacoteCompletoSstItem({
  servico_nome: PACOTE_COMPLETO_SST_NOME,
  quantidade: "21",
  valor_unitario: "R$ 3.200,00",
  valor_total: "3200",
});
assert.equal(formAcima20.valor_unitario, "");
assert.equal(formAcima20.valor_total, "");

const formOutroMantem = applyValorAutomaticoPacoteCompletoSstItem({
  servico_nome: "Treinamento NR",
  quantidade: "21",
  valor_unitario: "R$ 900,00",
  valor_total: "900",
});
assert.equal(formOutroMantem.valor_unitario, "R$ 900,00");

const payloadAuto = applyPacoteCompletoSstPrecoItensPayload([
  {
    servico_nome: PACOTE_COMPLETO_SST_NOME,
    quantidade: 5,
    valor_unitario: 1,
    valor_total: 1,
  },
]);
assert.equal(payloadAuto[0].valor_unitario, 1700);
assert.equal(payloadAuto[0].valor_total, 1700);

const payloadManual = applyPacoteCompletoSstPrecoItensPayload([
  {
    servico_nome: PACOTE_COMPLETO_SST_NOME,
    quantidade: 21,
    valor_unitario: 3800,
    valor_total: 3800,
  },
]);
assert.equal(payloadManual[0].valor_unitario, 3800);

const payloadOutro = applyPacoteCompletoSstPrecoItensPayload([
  {
    servico_nome: "Treinamento NR",
    quantidade: 5,
    valor_unitario: 900,
    valor_total: 900,
  },
]);
assert.equal(payloadOutro[0].valor_unitario, 900);

assert.equal(
  validateOrcamentoItensValores([
    {
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 21,
      valor_unitario: 0,
    },
  ]),
  "Para mais de 20 colaboradores do Pacote completo - SST, informe o valor negociado."
);
assert.equal(
  validateOrcamentoItensValores([
    {
      servico_nome: "Treinamento NR",
      quantidade: 5,
      valor_unitario: 0,
    },
  ]),
  "Informe o valor de todos os serviços."
);
assert.equal(
  validateOrcamentoItensValores([
    {
      servico_nome: PACOTE_COMPLETO_SST_NOME,
      quantidade: 5,
      valor_unitario: 0,
    },
  ]),
  null
);

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
    valor_unitario: "1.400,00",
  }),
];
assert.equal(resolveItemValorForm(umServico[0]), 1400);
assert.equal(calcSubtotalItens(umServico), 1400);

const dezColaboradores = [
  itemForm({
    servico_nome: "Pacote completo - SST",
    quantidade: "10",
    valor_unitario: "2.200,00",
  }),
];
assert.equal(calcSubtotalItens(dezColaboradores), 2200);

const pacoteManualSubtotal = [
  itemForm({
    servico_nome: PACOTE_COMPLETO_SST_NOME,
    quantidade: "6",
    valor_unitario: "R$ 1.650,00",
    valor_manual: true,
  }),
];
assert.equal(calcSubtotalItens(pacoteManualSubtotal), 1650);

const qtyChangePreservaManual = applyValorAutomaticoPacoteCompletoSstItem({
  servico_nome: PACOTE_COMPLETO_SST_NOME,
  quantidade: "7",
  valor_unitario: "R$ 1.650,00",
  valor_total: "1650",
  valor_manual: true,
});
assert.equal(qtyChangePreservaManual.valor_unitario, "R$ 1.650,00");

const qtyChangeRecalculaAuto = applyValorAutomaticoPacoteCompletoSstItem({
  servico_nome: PACOTE_COMPLETO_SST_NOME,
  quantidade: "7",
  valor_unitario: "R$ 1.800,00",
  valor_total: "1800",
  valor_manual: false,
});
assert.equal(qtyChangeRecalculaAuto.valor_unitario, "R$ 1.900,00");

const doisServicos = [
  itemForm({
    servico_nome: "Pacote completo - SST",
    quantidade: "2",
    valor_unitario: "1.400,00",
  }),
  itemForm({
    id: "2",
    servico_nome: "Treinamento NR",
    quantidade: "2",
    valor_unitario: "800,00",
  }),
];
assert.equal(calcSubtotalItens(doisServicos), 2200);

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
        valor_unitario: 1400,
        valor_total: 1400,
        ordem: 0,
      },
    ],
  }),
  2
);

console.log("test-orcamento-calculo: OK");
