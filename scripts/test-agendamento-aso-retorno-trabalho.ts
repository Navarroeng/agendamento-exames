/** Testes da regra ASO Retorno ao Trabalho — somente exame Clínico. */

import {
  ASO_RETORNO_AO_TRABALHO,
  filtrarExamesFormParaAso,
  filtrarNomesExamesParaAso,
  isAsoRetornoAoTrabalho,
  podeRemoverExameAgendamento,
} from "../lib/agendamento-aso-retorno-trabalho";
import {
  CLINICO_VALOR_ASO_RETORNO_TRABALHO,
  getClinicoValorNavarroAuto,
} from "../lib/exame-pricing";

let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err);
  }
}

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const CARGO_EXAMES = ["Clínico", "Audiometria", "ECG", "EEG"];

test("identifica ASO Retorno ao Trabalho", () => {
  assert(isAsoRetornoAoTrabalho(ASO_RETORNO_AO_TRABALHO), "deveria ser retorno");
  assert(!isAsoRetornoAoTrabalho("Admissional"), "admissional não é retorno");
});

test("filtra nomes do cargo para somente Clínico", () => {
  const filtered = filtrarNomesExamesParaAso(CARGO_EXAMES, ASO_RETORNO_AO_TRABALHO);
  assert(filtered.length === 1, "deveria ter 1 exame");
  assert(filtered[0] === "Clínico", "deveria ser Clínico");
});

test("mantém todos os exames para ASO Admissional", () => {
  const filtered = filtrarNomesExamesParaAso(CARGO_EXAMES, "Admissional");
  assert(filtered.length === 4, "deveria manter 4 exames");
});

test("filtra exames do formulário para somente Clínico", () => {
  const exams = [
    { tipo_exame: "Clínico" },
    { tipo_exame: "Audiometria" },
    { tipo_exame: "ECG" },
  ];
  const filtered = filtrarExamesFormParaAso(exams as never, ASO_RETORNO_AO_TRABALHO);
  assert(filtered.length === 1, "deveria ter 1 exame");
  assert(filtered[0].tipo_exame === "Clínico", "deveria ser Clínico");
});

test("valor cliente automático do Clínico é R$ 100", () => {
  assert(
    getClinicoValorNavarroAuto(ASO_RETORNO_AO_TRABALHO) ===
      CLINICO_VALOR_ASO_RETORNO_TRABALHO,
    "retorno ao trabalho deveria ser 100"
  );
});

test("não permite remover Clínico em Retorno ao Trabalho", () => {
  assert(
    !podeRemoverExameAgendamento(ASO_RETORNO_AO_TRABALHO, "Clínico"),
    "clínico não deveria ser removível"
  );
  assert(
    podeRemoverExameAgendamento(ASO_RETORNO_AO_TRABALHO, "Audiometria"),
    "complementar poderia ser removível se existisse"
  );
  assert(
    podeRemoverExameAgendamento("Admissional", "Clínico"),
    "admissional permite remover"
  );
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
