/** Smoke test: detecção de alterações não salvas no formulário de orçamento. */

import assert from "node:assert/strict";
import { getEmptyOrcamentoForm } from "../lib/orcamento-defaults";
import {
  isOrcamentoFormDirty,
  serializeOrcamentoFormSnapshot,
} from "../lib/orcamento-form-dirty";

const empty = getEmptyOrcamentoForm();
empty.numero = "2026-001";
const baseline = serializeOrcamentoFormSnapshot(empty);

assert.equal(isOrcamentoFormDirty(empty, baseline), false);

const dirty = { ...empty, cliente_nome: "EMPRESA TESTE" };
assert.equal(isOrcamentoFormDirty(dirty, baseline), true);

assert.equal(isOrcamentoFormDirty(empty, null), false);

console.log("test-orcamento-form-dirty: OK");
