/** Trava de submissão: impede salvamento concorrente sem bloquear agendamentos legítimos. */

import assert from "node:assert/strict";
import {
  armAgendamentoSaveReentry,
  createAgendamentoSaveLock,
  exitAgendamentoSave,
  tryEnterAgendamentoSave,
} from "../lib/agendamento-save-lock";

const lock = createAgendamentoSaveLock();

assert.equal(tryEnterAgendamentoSave(lock), true, "primeiro Salvar entra");
assert.equal(tryEnterAgendamentoSave(lock), false, "segundo clique concorrente é ignorado");
exitAgendamentoSave(lock);

assert.equal(tryEnterAgendamentoSave(lock), true, "após terminar, novo salvamento é permitido");
exitAgendamentoSave(lock);

assert.equal(armAgendamentoSaveReentry(lock), true, "Utilizar ASO arma exatamente uma reentrada");
assert.equal(armAgendamentoSaveReentry(lock), false, "segundo Utilizar não arma de novo");
assert.equal(tryEnterAgendamentoSave(lock), true, "executeSave continua a reentrada armada");
assert.equal(tryEnterAgendamentoSave(lock), false, "segunda executeSave concorrente é ignorada");
exitAgendamentoSave(lock);

assert.equal(
  tryEnterAgendamentoSave(lock),
  true,
  "após o fluxo do contrato, um novo agendamento (mesmo dia) continua permitido"
);
exitAgendamentoSave(lock);

console.log("test-agendamento-save-lock: OK");
