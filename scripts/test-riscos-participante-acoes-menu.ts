/** Menu ⋮ de ações do participante por status. */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

const menuSrc = readFileSync(
  join(process.cwd(), "components/riscos-psicossociais/RiscosCampanhaParticipantesSection.tsx"),
  "utf8"
);
assert.match(menuSrc, /addEventListener\("mousedown", onDoc, true\)/);
assert.match(menuSrc, /addEventListener\("keydown", onKey, true\)/);
assert.match(menuSrc, /removeEventListener\("mousedown", onDoc, true\)/);
assert.match(menuSrc, /removeEventListener\("keydown", onKey, true\)/);
assert.match(menuSrc, /e\.key !== "Escape"/);
assert.match(menuSrc, /stopPropagation\(\)/);
assert.match(menuSrc, /setMenuOpenId\(\(id\) => \(id === p\.id \? null : p\.id\)\)/);

console.log("test-riscos-participante-acoes-menu: OK");
