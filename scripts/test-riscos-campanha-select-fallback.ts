/**
 * Fallback de SELECT de campanha (logo migration pendente não pode zerar listagem).
 */
import assert from "node:assert/strict";
import {
  isRiscosCampanhaSelectSchemaError,
  RISCOS_CAMPANHA_SELECT,
  RISCOS_CAMPANHA_SELECT_SEM_LOGO,
} from "../lib/riscos-campanha";
import { RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO } from "../lib/riscos-campanha-origem";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("detecta erro de coluna logo_*", () => {
  assert.equal(
    isRiscosCampanhaSelectSchemaError({
      message: "column riscos_campanhas.logo_origem does not exist",
      code: "42703",
    }),
    true
  );
  assert.equal(
    isRiscosCampanhaSelectSchemaError({
      message: "Could not find the 'logo_storage_path' column",
      code: "PGRST204",
    }),
    true
  );
  assert.equal(
    isRiscosCampanhaSelectSchemaError({ message: "JWT expired", code: "401" }),
    false
  );
});

run("SELECT sem logo não inclui colunas logo_*", () => {
  assert.ok(RISCOS_CAMPANHA_SELECT.includes("logo_origem"));
  assert.ok(!RISCOS_CAMPANHA_SELECT_SEM_LOGO.includes("logo_"));
  assert.ok(RISCOS_CAMPANHA_SELECT_SEM_LOGO.includes("origem"));
});

run("status para progresso inclui encerrada (finalizado permanece na listagem)", () => {
  assert.ok(
    (RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO as readonly string[]).includes(
      "encerrada"
    )
  );
  assert.ok(
    (RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO as readonly string[]).includes(
      "aberta"
    )
  );
  assert.equal(
    (RISCOS_CAMPANHA_STATUS_PARA_PROGRESSO as readonly string[]).includes(
      "cancelada"
    ),
    false
  );
});

console.log("\nTodos os testes de fallback da listagem passaram.");
