/** Smoke: bloqueio manual tem prioridade e campos de restauração. */
import assert from "node:assert/strict";
import {
  BLOQUEIO_MANUAL_RESTAURADO_MOTIVO,
  buildCamposBloqueioManualAgendamento,
  isClienteBloqueioManual,
} from "../lib/cliente-bloqueio-manual";

assert.equal(isClienteBloqueioManual({ agendamento_bloqueio_manual: true }), true);
assert.equal(isClienteBloqueioManual({ agendamento_bloqueio_manual: false }), false);

const bloqueio = buildCamposBloqueioManualAgendamento({
  disponivelNova: false,
  manualAnterior: false,
  usuarioNome: "Admin",
  agoraIso: "2026-08-06T12:00:00.000Z",
});
assert.equal(bloqueio.disponivel_agendamento, false);
assert.equal(bloqueio.agendamento_bloqueio_manual, true);
assert.equal(bloqueio.agendamento_bloqueado_por, "Admin");
assert.equal(bloqueio.agendamento_bloqueado_em, "2026-08-06T12:00:00.000Z");

const mantem = buildCamposBloqueioManualAgendamento({
  disponivelNova: false,
  manualAnterior: true,
  bloqueadoEmAnterior: "2026-07-22T10:00:00.000Z",
  bloqueadoPorAnterior: "Admin",
  motivoAnterior: "Motivo original",
  usuarioNome: "Outro",
});
assert.equal(mantem.agendamento_bloqueado_em, "2026-07-22T10:00:00.000Z");
assert.equal(mantem.agendamento_bloqueado_por, "Admin");
assert.equal(mantem.agendamento_bloqueio_motivo, "Motivo original");

const libera = buildCamposBloqueioManualAgendamento({
  disponivelNova: true,
  manualAnterior: true,
  motivo: "Liberação autorizada",
});
assert.equal(libera.disponivel_agendamento, true);
assert.equal(libera.agendamento_bloqueio_manual, false);
assert.equal(libera.agendamento_bloqueado_em, null);
assert.equal(libera.agendamento_bloqueio_motivo, "Liberação autorizada");

assert.ok(BLOQUEIO_MANUAL_RESTAURADO_MOTIVO.includes("sobrescrita automática"));
console.log("test-cliente-bloqueio-manual: OK");
