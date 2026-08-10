/**
 * Garante que o portal só exibe interstícios oficiais do Formulário PDF.
 * Impede reintrodução de telas inventadas por dimensão interna.
 */
import assert from "node:assert/strict";
import {
  COPSOQ_INTERSTICIAIS_INVENTADOS_PROIBIDOS,
  COPSOQ_INTERSTICIAIS_OFICIAIS,
} from "../lib/copsoq/intersticiais";
import { buildCopsoqFlow, getDimensaoById } from "../lib/copsoq/instrument";

const OFICIAIS_ESPERADOS = [
  {
    antesDeCodigo: "14A",
    texto:
      "As próximas duas perguntas são sobre a forma como o seu trabalho afeta a sua vida particular e familiar.",
  },
  {
    antesDeCodigo: "15A",
    texto:
      "As próximas quatro perguntas não são sobre o seu próprio trabalho, mas sobre a empresa em que você trabalha.",
  },
  {
    antesDeCodigo: "17",
    texto:
      "As próximas cinco perguntas são sobre a sua própria saúde e bem-estar. Por favor, tente não distinguir entre sintomas que são causados pelo trabalho e sintomas que se devem a outras causas. Descreva como você está no geral. As perguntas são sobre a sua saúde e bem-estar nas últimas quatro semanas:",
  },
  {
    antesDeCodigo: "23",
    texto:
      "“Bullying” significa que uma pessoa é repetidamente exposta a tratamento desagradável ou degradante, do qual a vítima tem dificuldade para se defender.",
  },
] as const;

assert.equal(COPSOQ_INTERSTICIAIS_OFICIAIS.length, 4);
assert.equal(OFICIAIS_ESPERADOS.length, 4);

for (let i = 0; i < OFICIAIS_ESPERADOS.length; i += 1) {
  const esp = OFICIAIS_ESPERADOS[i]!;
  const at = COPSOQ_INTERSTICIAIS_OFICIAIS[i]!;
  assert.equal(at.antesDeCodigo, esp.antesDeCodigo);
  assert.equal(at.texto, esp.texto);
}

const { items } = buildCopsoqFlow();
const transicoes = items.filter((i) => i.type === "transicao");
const perguntas = items.filter((i) => i.type === "pergunta");

assert.equal(perguntas.length, 40);
assert.equal(transicoes.length, 4, "Somente 4 interstícios oficiais no fluxo");
assert.equal(items[0]?.type, "pergunta", "Fluxo não deve começar com interstício inventado");

for (const t of transicoes) {
  assert.equal(t.type, "transicao");
  if (t.type !== "transicao") continue;
  const oficial = OFICIAIS_ESPERADOS.find((o) => o.antesDeCodigo === t.antesDeCodigo);
  assert.ok(oficial, `Interstício não oficial antes de ${t.antesDeCodigo}`);
  assert.equal(t.texto, oficial.texto);
  assert.equal(t.titulo, "Orientação");
}

for (const esp of OFICIAIS_ESPERADOS) {
  const idxPerg = items.findIndex(
    (i) => i.type === "pergunta" && i.pergunta.codigo === esp.antesDeCodigo
  );
  assert.ok(idxPerg > 0, `Pergunta ${esp.antesDeCodigo} não encontrada`);
  const prev = items[idxPerg - 1]!;
  assert.equal(prev.type, "transicao", `Falta interstício antes de ${esp.antesDeCodigo}`);
  if (prev.type === "transicao") {
    assert.equal(prev.texto, esp.texto);
    assert.equal(prev.antesDeCodigo, esp.antesDeCodigo);
  }
}

const bullying = COPSOQ_INTERSTICIAIS_OFICIAIS.find((i) => i.antesDeCodigo === "23");
assert.ok(bullying);
assert.ok(bullying!.texto.includes("Bullying"));
assert.ok(bullying!.texto.includes("dificuldade para se defender"));

// Dimensões inventadas existem no backend, mas NÃO viram tela no fluxo.
for (const dimId of COPSOQ_INTERSTICIAIS_INVENTADOS_PROIBIDOS) {
  const dim = getDimensaoById(dimId);
  assert.ok(dim, `Dimensão backend ausente: ${dimId}`);
  const textoIntro = dim!.textoIntroducao;
  const apareceComoTela = transicoes.some(
    (t) => t.type === "transicao" && t.texto === textoIntro
  );
  assert.equal(
    apareceComoTela,
    false,
    `Interstício inventado reintroduzido no fluxo: ${dimId}`
  );
}

const textosProibidosParciais = [
  "Demandas do trabalho",
  "Influência e desenvolvimento",
  "Significado e comprometimento",
  "Relações interpessoais",
  "Liderança",
  "Interface trabalho-indivíduo",
  "Burnout e Estresse",
  "Comportamentos ofensivos",
];
for (const nome of textosProibidosParciais) {
  assert.equal(
    transicoes.some((t) => t.type === "transicao" && t.texto.includes(nome)),
    false,
    `Nome de dimensão inventada no fluxo: ${nome}`
  );
}

console.log(
  "OK  test-copsoq-intersticiais: 4 oficiais preservados; inventados ausentes do fluxo"
);
