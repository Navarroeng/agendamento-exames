/** Testes de unicidade do Nº Recibo e-Social. */

import {
  ESOCIAL_RECIBO_DUPLICADO_MSG,
  EsocialReciboDuplicadoError,
} from "../lib/esocial-recibo-duplicidade";
import {
  maskEsocialRecibo,
  normalizeEsocialReciboForCompare,
} from "../lib/esocial-recibo";

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

test("normaliza trim e espaços internos", () => {
  assert(
    normalizeEsocialReciboForCompare(" 1.1.0000000042271883263 ") ===
      "1.1.0000000042271883263",
    "trim"
  );
  assert(
    normalizeEsocialReciboForCompare("1. 1. 0000000042271883263") ===
      "1.1.0000000042271883263",
    "espacos internos"
  );
});

test("recibo vazio não normaliza para valor", () => {
  assert(normalizeEsocialReciboForCompare("") === "", "vazio");
  assert(normalizeEsocialReciboForCompare("   ") === "", "somente espacos");
});

test("mesma normalização com máscara", () => {
  const raw = "110000000042271883263";
  const masked = maskEsocialRecibo(raw);
  assert(
    normalizeEsocialReciboForCompare(` ${masked} `) ===
      normalizeEsocialReciboForCompare(masked),
    "mascara equivalente"
  );
});

test("Erro de duplicidade expõe mensagem padrão", () => {
  const err = new EsocialReciboDuplicadoError(
    {
      id: "a",
      cliente_nome: "Empresa X",
      colaborador: "João",
      data_agendamento: "2026-06-10",
      aso: "Admissional",
      data_envio_esocial: "2026-06-12",
      esocial_recibo: "1.1.0000000042271883263",
    },
    "1.1.0000000042271883263"
  );
  assert(err.message === ESOCIAL_RECIBO_DUPLICADO_MSG, "mensagem");
  assert(err.info.id === "a", "info");
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
