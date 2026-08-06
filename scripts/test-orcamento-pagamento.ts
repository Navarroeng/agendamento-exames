/** Testes: condições de pagamento da proposta comercial (parcelas manuais). */

import assert from "node:assert/strict";
import {
  arredondarCentenaParaBaixo,
  calcCondicoesPagamentoProposta,
  calcQuantidadeParcelas,
  calcValorAVistaProposta,
  calcValorParcela,
  listOpcoesParcelas,
  resolveQuantidadeParcelasEscolhida,
} from "../lib/orcamento-pagamento";

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

console.log("test-orcamento-pagamento: OK");
