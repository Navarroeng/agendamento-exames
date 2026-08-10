import assert from "node:assert/strict";
import {
  COPSOQ_DIMENSOES,
  COPSOQ_PERGUNTAS,
  buildCopsoqFlow,
  getPerguntasOrdenadas,
} from "../lib/copsoq-ii-br";

const { items, totalPerguntas } = buildCopsoqFlow();

assert.equal(totalPerguntas, getPerguntasOrdenadas().length);
assert.ok(totalPerguntas >= 30, "questionário deve ter volume significativo");
assert.equal(COPSOQ_DIMENSOES.length, 7);

const dimIds = new Set(COPSOQ_DIMENSOES.map((d) => d.id));
for (const q of COPSOQ_PERGUNTAS) {
  assert.ok(dimIds.has(q.dimensaoId), `pergunta ${q.id} sem dimensão`);
}

const transicoes = items.filter((i) => i.type === "transicao");
const perguntas = items.filter((i) => i.type === "pergunta");
assert.equal(transicoes.length, 7);
assert.equal(perguntas.length, totalPerguntas);
assert.equal(items[0]?.type, "transicao");
assert.equal(items[1]?.type, "pergunta");

// Cada dimensão começa com transição antes da 1ª pergunta
for (const dim of COPSOQ_DIMENSOES) {
  const idx = items.findIndex(
    (i) => i.type === "transicao" && i.dimensao.id === dim.id
  );
  assert.ok(idx >= 0, `faltou transição ${dim.slug}`);
  const next = items[idx + 1];
  assert.ok(next && next.type === "pergunta");
  if (next?.type === "pergunta") {
    assert.equal(next.dimensao.id, dim.id);
  }
}

console.log(
  `OK  COPSOQ flow: ${totalPerguntas} perguntas, ${transicoes.length} transições, ${items.length} itens`
);
