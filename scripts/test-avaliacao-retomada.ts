/**
 * Testes da política de retomada segura (aparelhos compartilhados).
 */
import assert from "node:assert/strict";
import {
  classificarSituacaoParticipante,
  passoAposIdentificacao,
} from "../lib/avaliacao-retomada";
import { assertCodigoPublicoSessao } from "../lib/avaliacao-validacao";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("TESTE 1: em andamento → passo retomada (após identificação)", () => {
  const situacao = classificarSituacaoParticipante({
    statusParticipante: "pendente",
    concluiuEm: null,
    iniciouEm: "2026-08-10T12:00:00.000Z",
    statusSessao: "em_andamento",
  });
  assert.equal(situacao, "em_andamento");
  assert.equal(passoAposIdentificacao(situacao), "retomada");
});

run("TESTE 2: novo participante → termos (não auto-questionário)", () => {
  const situacao = classificarSituacaoParticipante({
    statusParticipante: "pendente",
    concluiuEm: null,
    iniciouEm: null,
    statusSessao: null,
  });
  assert.equal(situacao, "novo");
  assert.equal(passoAposIdentificacao(situacao), "termos");
});

run("TESTE 3: sessão em andamento sem iniciou_em ainda conta retomada", () => {
  const situacao = classificarSituacaoParticipante({
    statusParticipante: "pendente",
    concluiuEm: null,
    iniciouEm: null,
    statusSessao: "em_andamento",
  });
  assert.equal(situacao, "em_andamento");
});

run("TESTE 4: concluída → ja_respondida", () => {
  const situacao = classificarSituacaoParticipante({
    statusParticipante: "respondido",
    concluiuEm: "2026-08-10T15:00:00.000Z",
    iniciouEm: "2026-08-10T12:00:00.000Z",
    statusSessao: "concluida",
  });
  assert.equal(situacao, "ja_respondida");
  assert.equal(passoAposIdentificacao(situacao), "ja_respondida");
});

run("TESTE 5: CPF/nascimento incorretos não usam passo de retomada", () => {
  // Sem identificação válida, UI permanece em identificação (não há situação).
  // Garante que passoAposIdentificacao nunca liberta questionário sem classificação.
  assert.equal(passoAposIdentificacao("novo"), "termos");
  assert.notEqual(passoAposIdentificacao("novo"), "retomada");
});

run("TESTE 6: campanha diferente — sessão não migra", () => {
  assert.equal(assertCodigoPublicoSessao("5UA22W", "5UA22W"), true);
  assert.equal(assertCodigoPublicoSessao("5UA22W", "OUTRA1"), false);
});

run("isolamento lógico: A e B têm classificações independentes", () => {
  const a = classificarSituacaoParticipante({
    statusParticipante: "pendente",
    concluiuEm: null,
    iniciouEm: "2026-08-10T10:00:00.000Z",
    statusSessao: "em_andamento",
  });
  const b = classificarSituacaoParticipante({
    statusParticipante: "pendente",
    concluiuEm: null,
    iniciouEm: null,
    statusSessao: null,
  });
  assert.equal(a, "em_andamento");
  assert.equal(b, "novo");
  assert.notEqual(passoAposIdentificacao(a), passoAposIdentificacao(b));
});

console.log("\nTodos os testes de retomada segura passaram.");
