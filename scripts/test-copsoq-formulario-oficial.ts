/**
 * Fixture 40/40 vs Formulário oficial (PDF).
 * Garante código, ordem, texto, alternativas, valores, tipo, inversão e follow-ups 20–23.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getAlternativasDaPergunta,
  getPerguntasOrdenadas,
} from "../lib/copsoq/instrument";

type FixtureAlt = {
  id: string;
  label: string;
  pontuacao: number;
  ordem: number;
};

type FixturePergunta = {
  id: string;
  codigo: string;
  ordem: number;
  questaoPrincipal: number;
  texto: string;
  tipoEscala: string;
  pontuacaoInvertida: boolean;
  entraNoCalculo: boolean;
  obrigatoria: boolean;
  dimensaoId: string;
  textoAjuda: string | null;
  alternativas: FixtureAlt[];
  followUp: {
    id: string;
    texto: string;
    tipoEscala: string;
    multiplaEscolha: boolean;
    exibirQuandoRespostaDiferenteDe: string;
  } | null;
};

type Fixture = {
  fonte: string;
  total: number;
  perguntas: FixturePergunta[];
};

const fixturePath = join(
  process.cwd(),
  "lib",
  "copsoq",
  "__fixtures__",
  "formulario-oficial-40.json"
);

const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as Fixture;
const atuais = getPerguntasOrdenadas();

assert.equal(fixture.total, 40, "Fixture deve ter 40 perguntas");
assert.equal(fixture.perguntas.length, 40);
assert.equal(atuais.length, 40, "Instrumento deve ter 40 perguntas");

for (let i = 0; i < 40; i += 1) {
  const esp = fixture.perguntas[i]!;
  const at = atuais[i]!;
  const prefix = `[${i + 1}/${esp.codigo}]`;

  assert.equal(at.codigo, esp.codigo, `${prefix} código`);
  assert.equal(at.ordem, esp.ordem, `${prefix} ordem`);
  assert.equal(at.id, esp.id, `${prefix} id`);
  assert.equal(at.texto, esp.texto, `${prefix} texto`);
  assert.equal(at.tipoEscala, esp.tipoEscala, `${prefix} tipoEscala`);
  assert.equal(
    at.pontuacaoInvertida,
    esp.pontuacaoInvertida,
    `${prefix} inversão`
  );
  assert.equal(at.entraNoCalculo, esp.entraNoCalculo, `${prefix} entraNoCalculo`);
  assert.equal(at.obrigatoria, esp.obrigatoria, `${prefix} obrigatoria`);
  assert.equal(at.questaoPrincipal, esp.questaoPrincipal, `${prefix} questao`);
  assert.equal(at.dimensaoId, esp.dimensaoId, `${prefix} dimensaoId`);
  assert.equal(at.textoAjuda ?? null, esp.textoAjuda, `${prefix} textoAjuda`);

  const alts = getAlternativasDaPergunta(at);
  assert.equal(
    alts.length,
    esp.alternativas.length,
    `${prefix} qtd alternativas`
  );
  for (let j = 0; j < esp.alternativas.length; j += 1) {
    const ea = esp.alternativas[j]!;
    const aa = alts[j]!;
    assert.equal(aa.id, ea.id, `${prefix} alt[${j}].id`);
    assert.equal(aa.label, ea.label, `${prefix} alt[${j}].label`);
    assert.equal(aa.pontuacao, ea.pontuacao, `${prefix} alt[${j}].valor`);
    assert.equal(aa.ordem, ea.ordem, `${prefix} alt[${j}].ordem`);
  }

  if (esp.followUp) {
    assert.ok(at.followUp, `${prefix} followUp ausente`);
    assert.equal(at.followUp!.id, esp.followUp.id, `${prefix} followUp.id`);
    assert.equal(at.followUp!.texto, esp.followUp.texto, `${prefix} followUp.texto`);
    assert.equal(
      at.followUp!.tipoEscala,
      esp.followUp.tipoEscala,
      `${prefix} followUp.tipo`
    );
    assert.equal(
      at.followUp!.multiplaEscolha,
      esp.followUp.multiplaEscolha,
      `${prefix} followUp.multi`
    );
    assert.equal(
      at.followUp!.exibirQuandoRespostaDiferenteDe,
      esp.followUp.exibirQuandoRespostaDiferenteDe,
      `${prefix} followUp.exibir`
    );
  } else {
    assert.equal(at.followUp, undefined, `${prefix} followUp inesperado`);
  }
}

const complementares = ["20", "21", "22", "23"];
for (const codigo of complementares) {
  const p = atuais.find((x) => x.codigo === codigo);
  assert.ok(p, `Complementar ${codigo} ausente`);
  assert.ok(p!.followUp, `${codigo} deve ter follow-up de fontes`);
  assert.equal(p!.followUp!.tipoEscala, "fonte_exposicao");
  assert.equal(p!.followUp!.multiplaEscolha, true);
}

const p1b = atuais.find((p) => p.codigo === "1B")!;
assert.equal(p1b.pontuacaoInvertida, true, "1B deve ser invertida");

console.log(
  `OK  test-copsoq-formulario-oficial: 40/40 alinhado à fixture (${fixture.fonte})`
);
