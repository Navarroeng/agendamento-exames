import assert from "node:assert/strict";
import {
  COPSOQ_DIMENSOES,
  COPSOQ_PERGUNTAS,
  COPSOQ_TOTAL_PERGUNTAS,
  buildCopsoqFlow,
  getPerguntasOrdenadas,
} from "../lib/copsoq-ii-br";

const OFICIAL_01 =
  "Você atrasa a entrega do seu trabalho?";
const OFICIAL_40 =
  "Você foi exposto a bullying no seu local de trabalho durante os últimos 12 meses?";

const { items, totalPerguntas } = buildCopsoqFlow();
const perguntas = getPerguntasOrdenadas();

assert.equal(COPSOQ_TOTAL_PERGUNTAS, 40);
assert.equal(totalPerguntas, 40);
assert.equal(perguntas.length, 40);
assert.equal(COPSOQ_PERGUNTAS.length, 40);

assert.equal(perguntas[0]?.numero, 1);
assert.equal(perguntas[0]?.texto, OFICIAL_01);
assert.equal(perguntas[39]?.numero, 40);
assert.equal(perguntas[39]?.texto, OFICIAL_40);

const numeros = perguntas.map((p) => p.numero);
assert.deepEqual(
  numeros,
  Array.from({ length: 40 }, (_, i) => i + 1),
  "sequência 1–40 sem pulos"
);

const textos = perguntas.map((p) => p.texto);
assert.equal(new Set(textos).size, 40, "nenhuma pergunta duplicada");

const soPerguntas = items.filter((i) => i.type === "pergunta");
const transicoes = items.filter((i) => i.type === "transicao");
assert.equal(soPerguntas.length, 40);
assert.ok(transicoes.length >= 1);
assert.equal(items[0]?.type, "transicao");

// Transição não altera numeração
const q27 = soPerguntas.find((i) => i.type === "pergunta" && i.numero === 27);
const q28 = soPerguntas.find((i) => i.type === "pergunta" && i.numero === 28);
assert.ok(q27 && q28);
assert.equal(q27!.numero, 27);
assert.equal(q28!.numero, 28);

for (const d of COPSOQ_DIMENSOES) {
  assert.ok(
    perguntas.some((p) => p.dimensaoId === d.id),
    `dimensão sem perguntas: ${d.slug}`
  );
}

console.log(
  `OK  COPSOQ 40 perguntas, ${transicoes.length} transições, ${items.length} itens de fluxo`
);
