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

assert.equal(ORCAMENTO_ORIGEM_OPTIONS.length, 2);
assert.equal(formatOrcamentoOrigemCliente("indicacao"), "Indicação");
assert.equal(formatOrcamentoOrigemCliente("google"), "Google");
assert.equal(formatOrcamentoOrigemCliente(null), ORCAMENTO_ORIGEM_NAO_INFORMADO);
assert.equal(formatOrcamentoOrigemCliente(""), ORCAMENTO_ORIGEM_NAO_INFORMADO);
assert.ok(isOrcamentoOrigemCliente("indicacao"));
assert.ok(!isOrcamentoOrigemCliente(""));

const form = getEmptyOrcamentoForm();
form.numero = "2026-010";
const baseline = serializeOrcamentoFormSnapshot(form);
assert.equal(isOrcamentoFormDirty(form, baseline), false);

form.origem_cliente = "google";
assert.equal(isOrcamentoFormDirty(form, baseline), true);

console.log("test-orcamento-origem: OK");
