/** Testes: condições automáticas de pagamento da proposta comercial. */

import assert from "node:assert/strict";
import {
  arredondarCentenaParaBaixo,
  calcCondicoesPagamentoProposta,
  calcQuantidadeParcelas,
  calcValorAVistaProposta,
  calcValorParcela,
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

const caso1300 = calcCondicoesPagamentoProposta(1300);
assert.equal(caso1300.parcelas, 2);
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

console.log("test-orcamento-pagamento: OK");
