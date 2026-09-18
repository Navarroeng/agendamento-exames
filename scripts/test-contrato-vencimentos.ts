/** Cronograma de vencimentos do contrato documental pontual. */

import assert from "node:assert/strict";
import {
  CONTRATO_VENCIMENTOS_INCOMPLETOS_MSG,
  aplicarDatasNasParcelas,
  contratoUsaCronogramaVencimentos,
  isDataIsoValida,
  mesclarVencimentosSalvos,
  sugerirDatasVencimento,
  validarCronogramaVencimentos,
} from "../lib/contrato-vencimentos";
import { montarParcelasPontual } from "../lib/contrato-pagamento";

assert.equal(contratoUsaCronogramaVencimentos("aet"), true);
assert.equal(contratoUsaCronogramaVencimentos("pontual_sst"), false);
assert.equal(contratoUsaCronogramaVencimentos("mensalidade"), false);

assert.equal(isDataIsoValida("2026-09-18"), true);
assert.equal(isDataIsoValida("2026-02-30"), false);
assert.equal(isDataIsoValida(""), false);

assert.deepEqual(sugerirDatasVencimento("2026-09-18", 1), ["2026-09-18"]);
assert.deepEqual(sugerirDatasVencimento("2026-09-18", 2), [
  "2026-09-18",
  "2026-10-18",
]);
assert.deepEqual(sugerirDatasVencimento("2026-09-18", 3), [
  "2026-09-18",
  "2026-10-18",
  "2026-11-18",
]);
assert.deepEqual(sugerirDatasVencimento("2027-01-31", 3), [
  "2027-01-31",
  "2027-02-28",
  "2027-03-31",
]);
assert.deepEqual(sugerirDatasVencimento("2028-01-31", 3), [
  "2028-01-31",
  "2028-02-29",
  "2028-03-31",
]);

assert.equal(
  validarCronogramaVencimentos(["2026-09-18"], 2),
  CONTRATO_VENCIMENTOS_INCOMPLETOS_MSG
);
assert.equal(
  validarCronogramaVencimentos(["2026-09-18", ""], 2),
  CONTRATO_VENCIMENTOS_INCOMPLETOS_MSG
);
assert.equal(
  validarCronogramaVencimentos(["2026-09-18", "2026-10-18"], 2),
  null
);

const mescladas = mesclarVencimentosSalvos({
  quantidade: 2,
  sugeridas: ["2026-09-18", "2026-10-18"],
  salvas: [{ indice: 1, data_vencimento: "2026-09-20" }],
});
assert.deepEqual(mescladas, ["2026-09-20", "2026-10-18"]);

const base = montarParcelasPontual({
  valorTotal: 3200,
  quantidadeParcelas: 2,
  dataContrato: "2026-09-18",
});
const aplicadas = aplicarDatasNasParcelas(base, ["2026-09-20", "2026-10-20"]);
assert.equal(aplicadas[0]?.valor, 1600);
assert.equal(aplicadas[1]?.valor, 1600);
assert.equal(aplicadas[0]?.dataIso, "2026-09-20");
assert.equal(aplicadas[1]?.dataIso, "2026-10-20");
assert.throws(
  () => aplicarDatasNasParcelas(base, ["2026-09-20"]),
  /Informe a data de vencimento de todas as parcelas/
);

console.log("test-contrato-vencimentos: OK");
