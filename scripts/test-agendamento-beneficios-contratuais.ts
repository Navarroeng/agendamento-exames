/** Prioridade de avisos: Periódico Futuro > ASO contratual em aberto. */

import assert from "node:assert/strict";
import { resolverProximoAvisoBeneficio } from "../lib/agendamento-beneficios-contratuais";

assert.equal(
  resolverProximoAvisoBeneficio({
    temPeriodicoFuturo: false,
    periodicoDecisao: "none",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "aso_aberto"
);

assert.equal(
  resolverProximoAvisoBeneficio({
    temPeriodicoFuturo: true,
    periodicoDecisao: "none",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "periodico_futuro"
);

assert.equal(
  resolverProximoAvisoBeneficio({
    temPeriodicoFuturo: true,
    periodicoDecisao: "link",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "nenhum"
);

assert.equal(
  resolverProximoAvisoBeneficio({
    temPeriodicoFuturo: true,
    periodicoDecisao: "skip",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "aso_apos_recusa_periodico"
);

assert.equal(
  resolverProximoAvisoBeneficio({
    temPeriodicoFuturo: false,
    periodicoDecisao: "none",
    temAsoAberto: false,
    creditoDecisao: "none",
  }),
  "nenhum"
);

assert.equal(
  resolverProximoAvisoBeneficio({
    temPeriodicoFuturo: false,
    periodicoDecisao: "none",
    temAsoAberto: true,
    creditoDecisao: "skip",
  }),
  "nenhum"
);

// Empresa selecionada, CPF ainda vazio → tratamento externo (sem periódico / sem aviso).
assert.equal(
  resolverProximoAvisoBeneficio({
    temPeriodicoFuturo: false,
    periodicoDecisao: "none",
    temAsoAberto: true,
    creditoDecisao: "none",
  }),
  "aso_aberto"
);

console.log("test-agendamento-beneficios-contratuais: OK");
