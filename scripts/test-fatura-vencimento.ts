import assert from "node:assert/strict";
import {
  calcQuintoDiaUtilDoMes,
  calcVencimentoFaturaCliente,
} from "../lib/fatura-vencimento";

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Jul/2026: 1 qua, 2 qui, 3 sex, 6 seg (4º), 7 ter (5º)
assert.equal(iso(calcQuintoDiaUtilDoMes(2026, 7)), "2026-07-07");

const venc = calcVencimentoFaturaCliente("06/2026");
assert.ok(venc);
assert.equal(venc.iso, "2026-07-07");
assert.equal(venc.label, "07/07/2026");

// Dez/2026 -> Jan/2027
const vencJan = calcVencimentoFaturaCliente("12/2026");
assert.ok(vencJan);
assert.equal(vencJan.iso, iso(calcQuintoDiaUtilDoMes(2027, 1)));

assert.equal(calcVencimentoFaturaCliente("13/2026"), null);

console.log("test-fatura-vencimento: ok");
