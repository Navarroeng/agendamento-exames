/** Menu ⋮ de ações do participante por status. */

import assert from "node:assert/strict";
import {
  acoesMenuParticipantePorStatus,
  podeEditarDadosParticipante,
} from "../lib/riscos-participante-acoes";

assert.deepEqual(acoesMenuParticipantePorStatus("pendente"), {
  exibirEditar: true,
  exibirRemover: true,
});
assert.deepEqual(acoesMenuParticipantePorStatus("iniciado"), {
  exibirEditar: false,
  exibirRemover: true,
});
assert.deepEqual(acoesMenuParticipantePorStatus("respondido"), {
  exibirEditar: false,
  exibirRemover: true,
});
assert.deepEqual(acoesMenuParticipantePorStatus("invalidado"), {
  exibirEditar: false,
  exibirRemover: false,
});
assert.deepEqual(acoesMenuParticipantePorStatus("removido"), {
  exibirEditar: false,
  exibirRemover: false,
});

assert.equal(podeEditarDadosParticipante("pendente"), true);
assert.equal(podeEditarDadosParticipante("iniciado"), false);
assert.equal(podeEditarDadosParticipante("respondido"), false);

console.log("test-riscos-participante-acoes-menu: OK");
