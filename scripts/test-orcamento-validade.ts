/** Testes: validade automática da proposta (emissão + 15 dias). */

import assert from "node:assert/strict";
import {
  VALIDADE_PROPOSTA_DIAS,
  calcValidadePropostaIso,
  resolveValidadePropostaIso,
} from "../lib/orcamento-validade";

assert.equal(VALIDADE_PROPOSTA_DIAS, 15);
assert.equal(calcValidadePropostaIso("2026-07-27"), "2026-08-11");
assert.equal(calcValidadePropostaIso("2026-07-27T12:00:00"), "2026-08-11");
assert.equal(resolveValidadePropostaIso("2026-01-31"), "2026-02-15");

console.log("test-orcamento-validade: OK");
