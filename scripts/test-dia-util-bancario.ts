/**
 * Calendário bancário da Resolução CMN nº 4.880/2020.
 * Rode: npx --yes tsx scripts/test-dia-util-bancario.ts
 */
import assert from "node:assert/strict";
import {
  calcQuintoDiaUtilDoMes,
  domingoDePascoa,
  feriadosBancariosMoveis,
  isDiaUtilBancario,
  isFeriadoBancarioNacional,
  quintoDiaUtilIsoDoMes,
} from "../lib/dia-util";

function iso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function data(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

assert.equal(iso(domingoDePascoa(2026)), "2026-04-05");
assert.equal(iso(domingoDePascoa(2024)), "2024-03-31");
assert.equal(iso(domingoDePascoa(2025)), "2025-04-20");

const moveis2026 = feriadosBancariosMoveis(2026).map(iso);
assert.deepEqual(moveis2026, [
  "2026-02-16",
  "2026-02-17",
  "2026-04-03",
  "2026-06-04",
]);

assert.equal(isDiaUtilBancario(data("2026-02-16")), false);
assert.equal(isDiaUtilBancario(data("2026-02-17")), false);
assert.equal(isDiaUtilBancario(data("2026-02-18")), true);
assert.equal(isFeriadoBancarioNacional(data("2026-04-03")), true);
assert.equal(isFeriadoBancarioNacional(data("2026-06-04")), true);

assert.equal(quintoDiaUtilIsoDoMes(2026, 1), "2026-01-08");
assert.equal(quintoDiaUtilIsoDoMes(2026, 4), "2026-04-08");
assert.equal(quintoDiaUtilIsoDoMes(2026, 5), "2026-05-08");
assert.equal(iso(calcQuintoDiaUtilDoMes(2025, 3)), "2025-03-11");

assert.equal(isDiaUtilBancario(data("2026-07-09")), true);
assert.equal(isDiaUtilBancario(data("2026-12-24")), true);
assert.equal(isDiaUtilBancario(data("2026-12-31")), true);

assert.equal(isFeriadoBancarioNacional(data("2023-11-20")), false);
assert.equal(isFeriadoBancarioNacional(data("2024-11-20")), true);
assert.equal(isDiaUtilBancario(data("2024-11-20")), false);

for (const year of [2030, 2035, 2040, 2099]) {
  const moveis = feriadosBancariosMoveis(year);
  assert.equal(moveis.length, 4);
  assert.equal(moveis[0].getDay(), 1);
  assert.equal(moveis[1].getDay(), 2);
  assert.equal(moveis[2].getDay(), 5);
  assert.equal(moveis[3].getDay(), 4);
  assert.equal(isFeriadoBancarioNacional(data(`${year}-05-01`)), true);
  assert.equal(isFeriadoBancarioNacional(data(`${year}-11-20`)), true);
  const quintoJaneiro = calcQuintoDiaUtilDoMes(year, 1);
  assert.notEqual(iso(quintoJaneiro), `${year}-01-01`);
  assert.equal(isDiaUtilBancario(quintoJaneiro), true);
  assert.equal(quintoJaneiro.getMonth(), 0);
}

console.log("OK  dia util bancario");
