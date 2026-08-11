import assert from "node:assert/strict";
import {
  campanhaExibeLinkConvite,
  campanhaPermiteCopiarLink,
  validateAbrirCampanhaRiscos,
  validatePreRequisitosAbrirCampanha,
} from "../lib/riscos-campanha";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const base = {
  status: "em_preparacao" as const,
  data_inicio: "2026-08-01",
  data_encerramento: "2026-08-31",
};

run("abrir dentro do período", () => {
  assert.equal(validateAbrirCampanhaRiscos(base, "2026-08-10"), null);
});

run("bloquear sem datas", () => {
  assert.ok(
    validateAbrirCampanhaRiscos({
      ...base,
      data_inicio: "",
      data_encerramento: "2026-08-31",
    })
  );
});

run("bloquear fora do período", () => {
  const msg = validateAbrirCampanhaRiscos(base, "2026-09-01");
  assert.ok(msg);
  assert.match(msg!, /período/i);
});

run("bloquear já aberta", () => {
  assert.ok(
    validateAbrirCampanhaRiscos({ ...base, status: "aberta" }, "2026-08-10")
  );
});

run("bloquear encerrada", () => {
  assert.ok(
    validateAbrirCampanhaRiscos({ ...base, status: "encerrada" }, "2026-08-10")
  );
});

run("pré-requisitos: lista + participantes OK (manual sem laudos)", () => {
  assert.equal(
    validatePreRequisitosAbrirCampanha({
      listaPresencaConcluida: true,
      participantesCadastrados: 3,
      exigeLaudosSst: false,
      laudosSstConcluido: false,
    }),
    null
  );
});

run("pré-requisitos: laudos exigidos bloqueiam abertura", () => {
  const msg = validatePreRequisitosAbrirCampanha({
    listaPresencaConcluida: true,
    participantesCadastrados: 1,
    exigeLaudosSst: true,
    laudosSstConcluido: false,
  });
  assert.ok(msg);
  assert.match(msg!, /Laudos SST/i);
});

run("pré-requisitos: lista pendente bloqueia", () => {
  assert.ok(
    validatePreRequisitosAbrirCampanha({
      listaPresencaConcluida: false,
      participantesCadastrados: 2,
      exigeLaudosSst: false,
    })
  );
});

run("convite: em preparação não exibe link", () => {
  assert.equal(campanhaExibeLinkConvite("em_preparacao"), false);
  assert.equal(campanhaPermiteCopiarLink("em_preparacao"), false);
});

run("convite: aberta exibe e permite copiar", () => {
  assert.equal(campanhaExibeLinkConvite("aberta"), true);
  assert.equal(campanhaPermiteCopiarLink("aberta"), true);
});

run("convite: encerrada exibe mas não copia", () => {
  assert.equal(campanhaExibeLinkConvite("encerrada"), true);
  assert.equal(campanhaPermiteCopiarLink("encerrada"), false);
});

console.log("\nTodos os testes de abertura de campanha passaram.");
