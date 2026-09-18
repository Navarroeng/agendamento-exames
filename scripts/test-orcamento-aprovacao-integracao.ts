/** Smoke test: validação CNPJ para integração de aprovação. */

import assert from "node:assert/strict";
import {
  ORCAMENTO_APROVACAO_CNPJ_OBRIGATORIO_MSG,
  assertOrcamentoCnpjParaAprovacao,
  formatCnpjAuditoria,
  isAprovacaoIntegracaoCompleta,
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

assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap-aet",
      cliente_id: "cli-1",
      contrato_id: null,
    },
    itens: [
      {
        servico_id: "aet",
        servico_nome: "Laudo AET – Análise Ergonômica do Trabalho",
      },
    ],
  }),
  true
);

assert.equal(
  isAprovacaoIntegracaoCompleta({
    result: {
      aprovacao_id: "ap-insal",
      cliente_id: "cli-1",
      contrato_id: null,
    },
    itens: [
      {
        servico_id: "insal",
        servico_nome: "Laudo de Insalubridade",
      },
    ],
  }),
  true
);

console.log("test-orcamento-aprovacao-integracao: OK");
