/** Smoke: status de procuração pendente/ativa/nao_necessaria. */

import assert from "node:assert/strict";
import {
  clienteProcuracaoRequerAtencao,
  formatClienteProcuracaoLabel,
  isProcuracaoStatusConcluida,
  normalizeClienteProcuracao,
  normalizeProcuracaoStatus,
} from "../lib/cliente-procuracao";
import { IMPLANTACAO_ETAPA_LABELS } from "../lib/implantacao-clientes";

assert.equal(normalizeProcuracaoStatus("inativa"), "pendente");
assert.equal(normalizeProcuracaoStatus("ativa"), "ativa");
assert.equal(normalizeProcuracaoStatus("nao_necessaria"), "nao_necessaria");
assert.equal(normalizeClienteProcuracao("inativa"), "pendente");

assert.equal(formatClienteProcuracaoLabel("ativa"), "Ativa");
assert.equal(formatClienteProcuracaoLabel("nao_necessaria"), "Não necessária");
assert.equal(formatClienteProcuracaoLabel("pendente"), "Pendente");
assert.equal(formatClienteProcuracaoLabel("inativa"), "Pendente");

assert.equal(isProcuracaoStatusConcluida("ativa"), true);
assert.equal(isProcuracaoStatusConcluida("nao_necessaria"), true);
assert.equal(isProcuracaoStatusConcluida("pendente"), false);

assert.equal(clienteProcuracaoRequerAtencao("pendente"), true);
assert.equal(clienteProcuracaoRequerAtencao("ativa"), false);
assert.equal(clienteProcuracaoRequerAtencao("nao_necessaria"), false);

assert.equal(
  IMPLANTACAO_ETAPA_LABELS.procuracao,
  "Aguardando procuração"
);

console.log("test-procuracao-status: OK");
