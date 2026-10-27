/** A aba do modal só reinicia na abertura ou na troca de orçamento. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chaveSessaoModalOrcamento } from "../lib/orcamento-modal-sessao";

const aberta = chaveSessaoModalOrcamento({
  orcamentoId: "orc-1",
  mode: "consulta",
  initialTab: "contrato",
});

assert.equal(
  chaveSessaoModalOrcamento({
    orcamentoId: "orc-1",
    mode: "consulta",
    initialTab: "contrato",
  }),
  aberta
);

assert.notEqual(
  chaveSessaoModalOrcamento({
    orcamentoId: "orc-2",
    mode: "consulta",
    initialTab: "contrato",
  }),
  aberta
);

assert.notEqual(
  chaveSessaoModalOrcamento({
    orcamentoId: "orc-1",
    mode: "consulta",
    initialTab: "resumo",
  }),
  aberta
);

assert.notEqual(
  chaveSessaoModalOrcamento({
    orcamentoId: "orc-1",
    mode: "aprovacao",
    initialTab: "contrato",
  }),
  aberta
);

const modal = readFileSync(
  "components/orcamentos/OrcamentoAprovarModal.tsx",
  "utf8"
);
const guarda = modal.indexOf("if (sessaoModalRef.current === sessao) return;");
const defineAba = modal.indexOf("setTab(tabInicial);");
assert.ok(guarda > 0, "o modal precisa ignorar a mesma sessão");
assert.ok(defineAba > guarda, "a aba inicial só roda depois da guarda da sessão");
assert.match(modal, /chaveSessaoModalOrcamento/);

console.log("test-orcamento-modal-sessao: OK");
