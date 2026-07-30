import assert from "node:assert/strict";
import {
  assertDataAgendamentoPermitida,
  DATA_AGENDAMENTO_PASSADA_MSG,
  isDataAgendamentoPermitida,
  todayIsoSaoPaulo,
} from "../lib/agendamento-datetime";

// Fixed "now" in SP: 2026-07-30 03:00 UTC = still 2026-07-29 in SP? 
// 2026-07-30T12:00:00Z = 09:00 SP = 2026-07-30
const meioDiaUtc = new Date("2026-07-30T12:00:00.000Z");
assert.equal(todayIsoSaoPaulo(meioDiaUtc), "2026-07-30");

// Perto da meia-noite SP: 2026-07-31 02:30 UTC = 2026-07-30 23:30 SP
const quaseMeiaNoiteSp = new Date("2026-07-31T02:30:00.000Z");
assert.equal(todayIsoSaoPaulo(quaseMeiaNoiteSp), "2026-07-30");

// Após meia-noite SP: 2026-07-31 03:30 UTC = 2026-07-31 00:30 SP
const aposMeiaNoiteSp = new Date("2026-07-31T03:30:00.000Z");
assert.equal(todayIsoSaoPaulo(aposMeiaNoiteSp), "2026-07-31");

const hoje = "2026-07-30";

assert.equal(
  isDataAgendamentoPermitida({ dataIso: "2026-07-29", hojeIso: hoje }),
  false
);
assert.equal(
  isDataAgendamentoPermitida({ dataIso: "2026-07-30", hojeIso: hoje }),
  true
);
assert.equal(
  isDataAgendamentoPermitida({ dataIso: "2026-07-31", hojeIso: hoje }),
  true
);

// Edição: preserva data original no passado
assert.equal(
  isDataAgendamentoPermitida({
    dataIso: "2026-07-20",
    dataOriginalIso: "2026-07-20",
    hojeIso: hoje,
  }),
  true
);

// Edição: trocar para outra data passada → bloqueia
assert.equal(
  isDataAgendamentoPermitida({
    dataIso: "2026-07-21",
    dataOriginalIso: "2026-07-20",
    hojeIso: hoje,
  }),
  false
);

// Edição: trocar passado → hoje/futuro → ok
assert.equal(
  isDataAgendamentoPermitida({
    dataIso: "2026-07-30",
    dataOriginalIso: "2026-07-20",
    hojeIso: hoje,
  }),
  true
);

assert.throws(
  () =>
    assertDataAgendamentoPermitida({
      dataIso: "2026-07-29",
      hojeIso: hoje,
    }),
  (err: unknown) =>
    err instanceof Error && err.message === DATA_AGENDAMENTO_PASSADA_MSG
);

console.log("ok: agendamento-data-minima");
