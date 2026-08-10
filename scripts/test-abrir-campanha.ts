import assert from "node:assert/strict";
import { validateAbrirCampanhaRiscos } from "../lib/riscos-campanha";

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

console.log("\nTodos os testes de abertura de campanha passaram.");
