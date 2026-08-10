import assert from "node:assert/strict";
import {
  COPSOQ_DIMENSOES,
  COPSOQ_ESCALAS,
  COPSOQ_INSTRUMENTO,
  COPSOQ_PERGUNTAS,
  buildCopsoqFlow,
  getPerguntasOrdenadas,
  pontuarAlternativa,
  getAlternativasDaPergunta,
  validarInstrumentoCopsoq,
} from "../lib/copsoq";

const report = validarInstrumentoCopsoq();
assert.equal(report.ok, true, report.erros.join("; "));
assert.equal(report.totais.questoesPrincipais, 23);
assert.equal(report.totais.perguntasAvaliativas, 40);
assert.equal(report.totais.dimensoes, 11);
assert.ok(report.totais.escalas >= 5);

const { items, totalPerguntas } = buildCopsoqFlow();
const perguntas = getPerguntasOrdenadas();

assert.equal(COPSOQ_INSTRUMENTO.totalPerguntasAvaliativas, 40);
assert.equal(totalPerguntas, 40);
assert.equal(perguntas.length, 40);
assert.equal(COPSOQ_PERGUNTAS.length, 40);

assert.equal(perguntas[0]?.codigo, "1A");
assert.equal(perguntas[0]?.texto, "Você atrasa a entrega do seu trabalho?");
assert.equal(perguntas[1]?.codigo, "1B");
assert.equal(perguntas[1]?.pontuacaoInvertida, true);
assert.equal(perguntas[39]?.codigo, "23");
assert.ok(perguntas[39]?.texto.toLowerCase().includes("bullying"));

const soPerguntas = items.filter((i) => i.type === "pergunta");
const transicoes = items.filter((i) => i.type === "transicao");
assert.equal(soPerguntas.length, 40);
assert.equal(transicoes.length, COPSOQ_DIMENSOES.length);
assert.equal(items[0]?.type, "transicao");

for (const d of COPSOQ_DIMENSOES) {
  assert.ok(
    perguntas.some((p) => p.dimensaoId === d.id),
    `dimensão sem perguntas: ${d.id}`
  );
}

const ofensivos = COPSOQ_DIMENSOES.find((d) => d.id === "comportamentos-ofensivos");
assert.ok(ofensivos);
assert.equal(ofensivos!.entraNoCalculo, false);

const p1b = perguntas.find((p) => p.codigo === "1B")!;
const alts = getAlternativasDaPergunta(p1b);
const sempre = alts.find((a) => a.label === "Sempre")!;
assert.equal(sempre.pontuacao, 4);
assert.equal(pontuarAlternativa(p1b, sempre), 0);

const escalaIds = new Set(COPSOQ_ESCALAS.map((e) => e.id));
assert.ok(escalaIds.has("frequencia"));
assert.ok(escalaIds.has("intensidade"));
assert.ok(escalaIds.has("satisfacao"));
assert.ok(escalaIds.has("saude"));
assert.ok(escalaIds.has("exposicao"));

console.log(
  `OK  COPSOQ oficial: ${report.totais.questoesPrincipais} questões, ${report.totais.perguntasAvaliativas} itens, ${transicoes.length} dimensões/transições, ${report.totais.escalas} escalas`
);
