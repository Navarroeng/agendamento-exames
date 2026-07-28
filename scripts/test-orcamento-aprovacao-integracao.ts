/** Smoke test: validação CNPJ para integração de aprovação. */

import assert from "node:assert/strict";
import {
  ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG,
  assertOrcamentoCnpjParaAprovacao,
  formatCnpjAuditoria,
  resolveOrcamentoCnpjDigits,
} from "../lib/orcamento-aprovacao-integracao";

assert.equal(resolveOrcamentoCnpjDigits("12.345.678/0001-95"), "12345678000195");
assert.equal(resolveOrcamentoCnpjDigits("123"), null);
assert.equal(resolveOrcamentoCnpjDigits(null), null);

assert.equal(
  assertOrcamentoCnpjParaAprovacao("12.345.678/0001-95"),
  "12345678000195"
);

try {
  assertOrcamentoCnpjParaAprovacao("");
  assert.fail("deveria lançar");
} catch (err) {
  assert.equal(
    err instanceof Error && err.message,
    ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG
  );
}

assert.equal(
  formatCnpjAuditoria("12345678000195"),
  "12.345.678/0001-95"
);

console.log("test-orcamento-aprovacao-integracao: OK");
