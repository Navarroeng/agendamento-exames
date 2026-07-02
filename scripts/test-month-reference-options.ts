import assert from "node:assert/strict";
import { getCurrentMonthYearBR } from "../lib/fatura-mes-resumo";
import {
  buildMonthReferenceOptions,
  formatMonthYearBR,
  getCurrentMonthReferenceBR,
  resolveMonthReferenceValue,
} from "../lib/month-reference-options";
import { currentMonthReferenciaBR } from "../lib/relatorios/filters";

const options = buildMonthReferenceOptions(new Date(2026, 5, 15)); // Jun/2026

assert.equal(options.length, 24);
assert.equal(options[0], "05/2026");
assert.equal(options[12], "05/2027");
assert.equal(options[23], "04/2028");

assert.equal(formatMonthYearBR(new Date(2026, 0, 1)), "01/2026");
assert.equal(getCurrentMonthReferenceBR(), getCurrentMonthYearBR());
assert.equal(currentMonthReferenciaBR(), getCurrentMonthReferenceBR());

assert.equal(resolveMonthReferenceValue("06/2026", options), "06/2026");
assert.equal(
  resolveMonthReferenceValue("99/2099", options),
  getCurrentMonthReferenceBR()
);

console.log("test-month-reference-options: ok");
