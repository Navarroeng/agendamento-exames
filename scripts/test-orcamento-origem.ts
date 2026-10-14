/** Smoke test: origem do cliente no orçamento. */

import assert from "node:assert/strict";
import {
  formatOrcamentoOrigemCliente,
  isOrcamentoOrigemCliente,
  ORCAMENTO_ORIGEM_NAO_INFORMADO,
  ORCAMENTO_ORIGEM_OPTIONS,
} from "../lib/orcamento-origem";
import { getEmptyOrcamentoForm } from "../lib/orcamento-defaults";
import {
  isOrcamentoFormDirty,
  serializeOrcamentoFormSnapshot,
} from "../lib/orcamento-form-dirty";

assert.equal(ORCAMENTO_ORIGEM_OPTIONS.length, 4);
assert.deepEqual(
  ORCAMENTO_ORIGEM_OPTIONS.map((option) => option.label),
  ["Indicação", "Google", "Renovação", "Cliente da base"]
);
assert.equal(formatOrcamentoOrigemCliente("indicacao"), "Indicação");
assert.equal(formatOrcamentoOrigemCliente("google"), "Google");
assert.equal(formatOrcamentoOrigemCliente("renovacao"), "Renovação");
assert.equal(formatOrcamentoOrigemCliente("cliente_base"), "Cliente da base");
assert.equal(formatOrcamentoOrigemCliente(null), ORCAMENTO_ORIGEM_NAO_INFORMADO);
assert.equal(formatOrcamentoOrigemCliente(""), ORCAMENTO_ORIGEM_NAO_INFORMADO);
assert.equal(formatOrcamentoOrigemCliente("outra"), ORCAMENTO_ORIGEM_NAO_INFORMADO);
assert.ok(isOrcamentoOrigemCliente("indicacao"));
assert.ok(isOrcamentoOrigemCliente("renovacao"));
assert.ok(isOrcamentoOrigemCliente("cliente_base"));
assert.ok(!isOrcamentoOrigemCliente(""));

const form = getEmptyOrcamentoForm();
assert.equal(form.origem_cliente, "");
form.numero = "2026-010";
const baseline = serializeOrcamentoFormSnapshot(form);
assert.equal(isOrcamentoFormDirty(form, baseline), false);

form.origem_cliente = "renovacao";
assert.equal(isOrcamentoFormDirty(form, baseline), true);

form.origem_cliente = "cliente_base";
assert.equal(isOrcamentoFormDirty(form, baseline), true);
assert.equal(formatOrcamentoOrigemCliente(form.origem_cliente), "Cliente da base");


console.log("test-orcamento-origem: OK");
