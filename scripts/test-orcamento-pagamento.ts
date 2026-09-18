/** Testes: condições de pagamento da proposta comercial (parcelas manuais). */

import assert from "node:assert/strict";
import {
  arredondarCentenaParaBaixo,
  calcCondicoesPagamentoProposta,
  calcQuantidadeParcelas,
  calcValorAVistaOrcamento,
  calcValorAVistaProposta,
  calcValorParcela,
  formatCondicaoPagamentoParcelas,
  itensFormParaDescontoAvista,
  listOpcoesParcelas,
  resolveQuantidadeParcelasEscolhida,
  splitValoresDescontoAvista,
} from "../lib/orcamento-pagamento";
import type { OrcamentoItemFormItem } from "../lib/orcamento-types";
import { SERVICO_AET_NOME } from "../lib/servico-aet";
import { SERVICO_INSALUBRIDADE_NOME } from "../lib/servico-insalubridade";
import { PACOTE_COMPLETO_SST_NOME } from "../lib/servico-sst-pacote";

assert.equal(arredondarCentenaParaBaixo(1235), 1200);
assert.equal(arredondarCentenaParaBaixo(3040), 3000);
assert.equal(arredondarCentenaParaBaixo(8455), 8400);
assert.equal(arredondarCentenaParaBaixo(7125), 7100);
assert.equal(arredondarCentenaParaBaixo(902.5), 900);

assert.equal(calcQuantidadeParcelas(1300), 2);
assert.equal(calcValorParcela(1300, 2), 650);
assert.equal(calcValorAVistaProposta(1300), 1200);

assert.equal(calcQuantidadeParcelas(3200), 6);
assert.equal(calcValorParcela(3200, 6), 533.33);
assert.equal(calcValorAVistaProposta(3200), 3000);

assert.equal(calcQuantidadeParcelas(7500), 10);
assert.equal(calcValorParcela(7500, 10), 750);
assert.equal(calcValorAVistaProposta(7500), 7100);

assert.equal(calcQuantidadeParcelas(950), 1);
assert.equal(calcValorParcela(950, 1), 950);
assert.equal(calcValorAVistaProposta(950), 900);

assert.equal(calcQuantidadeParcelas(2000), 4);
assert.deepEqual(listOpcoesParcelas(2000), [1, 2, 3, 4]);
assert.equal(calcQuantidadeParcelas(3500), 7);
assert.deepEqual(listOpcoesParcelas(3500), [1, 2, 3, 4, 5, 6, 7]);
assert.equal(calcQuantidadeParcelas(8000), 10);
assert.deepEqual(listOpcoesParcelas(8000), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

assert.equal(resolveQuantidadeParcelasEscolhida(2000, null), 4);
assert.equal(resolveQuantidadeParcelasEscolhida(2000, 3), 3);
assert.equal(resolveQuantidadeParcelasEscolhida(2000, 9), 4);
assert.equal(resolveQuantidadeParcelasEscolhida(2000, 0), 1);
assert.equal(resolveQuantidadeParcelasEscolhida(8000, 10), 10);

const caso1300 = calcCondicoesPagamentoProposta(1300);
assert.equal(caso1300.parcelas, 2);
assert.equal(caso1300.maxParcelas, 2);
assert.equal(caso1300.valorParcela, 650);
assert.equal(caso1300.valorAVista, 1200);
assert.equal(caso1300.permitePagamentoAVista, true);
assert.equal(caso1300.textoParcelado, "2x de R$ 650,00");
assert.equal(caso1300.textoAVista, "R$ 1.200,00");

const caso3200 = calcCondicoesPagamentoProposta(3200);
assert.equal(caso3200.parcelas, 6);
assert.equal(caso3200.valorParcela, 533.33);
assert.equal(caso3200.valorAVista, 3000);

const caso7500 = calcCondicoesPagamentoProposta(7500);
assert.equal(caso7500.parcelas, 10);
assert.equal(caso7500.valorParcela, 750);
assert.equal(caso7500.valorAVista, 7100);

const caso950 = calcCondicoesPagamentoProposta(950);
assert.equal(caso950.parcelas, 1);
assert.equal(caso950.valorParcela, 950);
assert.equal(caso950.valorAVista, 900);

const casoManual = calcCondicoesPagamentoProposta(8000, 3);
assert.equal(casoManual.parcelas, 3);
assert.equal(casoManual.maxParcelas, 10);
assert.equal(casoManual.valorParcela, 2666.67);
assert.equal(casoManual.textoParcelado, "3x de R$ 2.666,67");

const casoClamp = calcCondicoesPagamentoProposta(2000, 10);
assert.equal(casoClamp.parcelas, 4);
assert.deepEqual(casoClamp.opcoesParcelas, [1, 2, 3, 4]);

assert.equal(calcValorAVistaProposta(4600), 4300);

const pacoteMaisOutro = [
  { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
  { servico_nome: "Outros", valor: 45 },
];
assert.deepEqual(splitValoresDescontoAvista(pacoteMaisOutro), {
  elegivel: 4600,
  demais: 45,
});
assert.equal(calcValorAVistaOrcamento(pacoteMaisOutro), 4345);
assert.notEqual(calcValorAVistaProposta(4645), 4345);

const pacoteMaisVarios = [
  { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
  { servico_nome: "Exames Complementares - Audiometria", valor: 45 },
  { servico_nome: "Outro serviço", valor: 200 },
];
assert.equal(calcValorAVistaOrcamento(pacoteMaisVarios), 4545);

assert.equal(
  calcValorAVistaOrcamento([
    { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
  ]),
  4300
);

const pacoteNegociado = [
  { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4800 },
  { servico_nome: "Outros", valor: 45 },
];
assert.equal(calcValorAVistaOrcamento(pacoteNegociado), 4545);

const adicionalAlterado = [
  { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
  { servico_nome: "Outros", valor: 90 },
];
assert.equal(calcValorAVistaOrcamento(adicionalAlterado), 4390);

assert.equal(
  calcValorAVistaOrcamento([
    { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
  ]),
  4300
);
assert.equal(
  calcValorAVistaOrcamento([
    { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
    { servico_nome: "Outros", valor: 45 },
  ]),
  4345
);
assert.equal(
  calcValorAVistaOrcamento([
    { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
    { servico_nome: "Outros", valor: 200 },
  ]),
  4500
);

const adicionalPrimeiro = [
  { servico_nome: "Audiometria", valor: 45 },
  { servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 4600 },
];
assert.equal(calcValorAVistaOrcamento(adicionalPrimeiro), 4345);

assert.equal(
  calcValorAVistaOrcamento(
    [
      {
        servico_id: "pacote-id",
        servico_nome: "Nome qualquer",
        valor: 4600,
      },
      { servico_id: "outros-id", servico_nome: "Outros", valor: 45 },
    ],
    "pacote-id"
  ),
  4345
);

const condicoesComAdicionais = calcCondicoesPagamentoProposta(
  4645,
  null,
  pacoteMaisOutro
);
assert.equal(condicoesComAdicionais.valorTotal, 4645);
assert.equal(condicoesComAdicionais.valorAVista, 4345);
assert.equal(
  condicoesComAdicionais.maxParcelas,
  calcQuantidadeParcelas(4645)
);
assert.notEqual(
  condicoesComAdicionais.maxParcelas,
  calcQuantidadeParcelas(4345)
);

const formItens: OrcamentoItemFormItem[] = [
  {
    id: "1",
    servico_id: "s-pacote",
    servico_nome: PACOTE_COMPLETO_SST_NOME,
    quantidade: "3",
    valor_unitario: "4.600,00",
    valor_total: "4600",
    valor_manual: true,
  },
  {
    id: "2",
    servico_id: "s-outros",
    servico_nome: "Outros",
    quantidade: "1",
    valor_unitario: "45,00",
    valor_total: "45",
    valor_manual: true,
  },
];
assert.equal(
  calcValorAVistaOrcamento(itensFormParaDescontoAvista(formItens)),
  4345
);

const aetItens = [
  { servico_id: "aet-1", servico_nome: SERVICO_AET_NOME, valor: 3200 },
];
assert.equal(calcValorAVistaOrcamento(aetItens), 0);
assert.notEqual(calcValorAVistaProposta(3200), 0);

const condicoesAet = calcCondicoesPagamentoProposta(3200, 2, aetItens);
assert.equal(condicoesAet.permitePagamentoAVista, false);
assert.equal(condicoesAet.valorAVista, 0);
assert.equal(condicoesAet.textoAVista, "");
assert.equal(condicoesAet.parcelas, 2);
assert.equal(condicoesAet.valorParcela, 1600);
assert.equal(condicoesAet.valorTotal, 3200);
assert.equal(condicoesAet.textoParcelado, "2x de R$ 1.600,00");
assert.equal(
  formatCondicaoPagamentoParcelas(2, 1600),
  "2 parcelas de R$ 1.600,00"
);
assert.notEqual(condicoesAet.valorAVista, calcValorAVistaProposta(3200));

const insalItens = [
  {
    servico_id: "insal-1",
    servico_nome: SERVICO_INSALUBRIDADE_NOME,
    valor: 4500,
  },
];
const condicoesInsal = calcCondicoesPagamentoProposta(4500, 2, insalItens);
assert.equal(condicoesInsal.permitePagamentoAVista, false);
assert.equal(condicoesInsal.valorAVista, 0);
assert.equal(condicoesInsal.textoAVista, "");
assert.equal(condicoesInsal.parcelas, 2);
assert.equal(condicoesInsal.valorParcela, 2250);

const pacoteItens = [
  { servico_id: "sst-1", servico_nome: PACOTE_COMPLETO_SST_NOME, valor: 3200 },
];
const condicoesPacote = calcCondicoesPagamentoProposta(3200, 2, pacoteItens);
assert.equal(condicoesPacote.permitePagamentoAVista, true);
assert.ok((condicoesPacote.valorAVista ?? 0) > 0);

const treinamentoItens = [
  { servico_nome: "Treinamento NR-12", valor: 1800 },
];
const condicoesTreino = calcCondicoesPagamentoProposta(
  1800,
  3,
  treinamentoItens
);
assert.equal(condicoesTreino.permitePagamentoAVista, true);
assert.equal(condicoesTreino.valorAVista, 1800);

console.log("test-orcamento-pagamento: OK");
