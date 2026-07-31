import assert from "node:assert/strict";
import {
  buildMensagemVisitaTecnica,
  diaSemanaVisitaPt,
  formatHorarioVisitaDisplay,
} from "../lib/orcamento-visita-mensagem";

assert.equal(diaSemanaVisitaPt("2026-07-30"), "Quinta-feira");
assert.equal(diaSemanaVisitaPt("2026-07-31"), "Sexta-feira");
assert.equal(formatHorarioVisitaDisplay("9:00"), "09:00");
assert.equal(formatHorarioVisitaDisplay("14:30"), "14:30");

const msg = buildMensagemVisitaTecnica({
  data: "2026-07-30",
  horario: "09:00",
  endereco: "Rua Exemplo, 100 — Centro",
});

assert.ok(msg.includes("Confirmação Visita Técnica 👷‍♂️💼✅"));
assert.ok(msg.includes("Data - 30/07/2026 - Quinta-feira às 09:00"));
assert.ok(msg.includes("📍 Endereço:"));
assert.ok(msg.includes("Rua Exemplo, 100 — Centro"));
assert.ok(msg.includes("Eng. Responsável: Pedro Navarro."));
assert.ok(msg.includes("CREA 5069206790."));
assert.ok(
  msg.includes(
    "Navarro Engenharia de Segurança e Medicina Ocupacional 👷‍♂️👩🏻‍⚕️"
  )
);
assert.ok(msg.includes("navarroeng.com.br"));
assert.ok(!msg.includes("Olá!"));

console.log("ok: orcamento-visita-mensagem");
