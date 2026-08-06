/** Testes da regra de duplicidade (90 dias + CPF + tipo ASO). */

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeCpfDigits(value) {
  return onlyDigits(value);
}

function normalizeEmpresaNome(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeTipoAso(value) {
  return String(value ?? "").trim().toLowerCase();
}

function parseIsoDateOnly(value) {
  const base = value.split("T")[0];
  const [year, month, day] = base.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function diasEntreAgendamentos(isoA, isoB) {
  const a = parseIsoDateOnly(isoA).getTime();
  const b = parseIsoDateOnly(isoB).getTime();
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function violaDuplicidade90Dias(diasEntre) {
  return diasEntre < 90;
}

function classificarDuplicidade90Dias(input) {
  if (normalizeTipoAso(input.statusExistente) === "cancelado") return "permitir";
  const tipoNovo = normalizeTipoAso(input.tipoAsoNovo);
  if (!tipoNovo) return "permitir";

  const cpfNovo = normalizeCpfDigits(input.cpfNovo);
  const cpfExistente = normalizeCpfDigits(input.cpfExistente);
  if (cpfNovo.length !== 11 || cpfExistente.length !== 11) return "permitir";
  if (cpfNovo !== cpfExistente) return "permitir";

  if (
    normalizeEmpresaNome(input.empresaNova) !==
    normalizeEmpresaNome(input.empresaExistente)
  ) {
    return "permitir";
  }

  if (
    !violaDuplicidade90Dias(
      diasEntreAgendamentos(input.dataNova, input.dataExistente)
    )
  ) {
    return "permitir";
  }

  const tipoExistente = normalizeTipoAso(input.tipoAsoExistente);
  if (tipoExistente && tipoExistente === tipoNovo) return "bloquear";
  return "avisar";
}

const CPF = "459.872.378-58";
const EMPRESA = "ALUMINIO FIRENZE";
const BASE = "2026-06-24";
const NOVA = "2026-08-10";

let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err);
  }
}

function assertEq(actual, expected) {
  if (actual !== expected) {
    throw new Error(`esperado ${expected}, recebeu ${actual}`);
  }
}

test("Caso real Demissional → Admissional → AVISAR", () => {
  assertEq(
    classificarDuplicidade90Dias({
      cpfNovo: CPF,
      cpfExistente: CPF,
      empresaNova: EMPRESA,
      empresaExistente: EMPRESA,
      dataNova: NOVA,
      dataExistente: BASE,
      statusExistente: "agendado",
      tipoAsoNovo: "Admissional",
      tipoAsoExistente: "Demissional",
    }),
    "avisar"
  );
});

test("Admissional → Admissional < 90 dias → BLOQUEAR", () => {
  assertEq(
    classificarDuplicidade90Dias({
      cpfNovo: CPF,
      cpfExistente: CPF,
      empresaNova: EMPRESA,
      empresaExistente: EMPRESA,
      dataNova: NOVA,
      dataExistente: BASE,
      statusExistente: "agendado",
      tipoAsoNovo: "Admissional",
      tipoAsoExistente: "Admissional",
    }),
    "bloquear"
  );
});

test("Periódico → Periódico < 90 dias → BLOQUEAR", () => {
  assertEq(
    classificarDuplicidade90Dias({
      cpfNovo: CPF,
      cpfExistente: CPF,
      empresaNova: EMPRESA,
      empresaExistente: EMPRESA,
      dataNova: NOVA,
      dataExistente: BASE,
      statusExistente: "agendado",
      tipoAsoNovo: "Periódico",
      tipoAsoExistente: "Periódico",
    }),
    "bloquear"
  );
});

test("Cancelado → PERMITIR", () => {
  assertEq(
    classificarDuplicidade90Dias({
      cpfNovo: CPF,
      cpfExistente: CPF,
      empresaNova: EMPRESA,
      empresaExistente: EMPRESA,
      dataNova: NOVA,
      dataExistente: BASE,
      statusExistente: "cancelado",
      tipoAsoNovo: "Admissional",
      tipoAsoExistente: "Admissional",
    }),
    "permitir"
  );
});

test("Mesmo ASO após 90 dias → PERMITIR", () => {
  assertEq(
    classificarDuplicidade90Dias({
      cpfNovo: CPF,
      cpfExistente: CPF,
      empresaNova: EMPRESA,
      empresaExistente: EMPRESA,
      dataNova: "2026-05-01",
      dataExistente: "2026-01-01",
      statusExistente: "agendado",
      tipoAsoNovo: "Admissional",
      tipoAsoExistente: "Admissional",
    }),
    "permitir"
  );
});

test("Empresa diferente → PERMITIR", () => {
  assertEq(
    classificarDuplicidade90Dias({
      cpfNovo: CPF,
      cpfExistente: CPF,
      empresaNova: "OUTRA",
      empresaExistente: EMPRESA,
      dataNova: NOVA,
      dataExistente: BASE,
      statusExistente: "agendado",
      tipoAsoNovo: "Admissional",
      tipoAsoExistente: "Admissional",
    }),
    "permitir"
  );
});

test("Sem tipo novo → PERMITIR (ainda não decide)", () => {
  assertEq(
    classificarDuplicidade90Dias({
      cpfNovo: CPF,
      cpfExistente: CPF,
      empresaNova: EMPRESA,
      empresaExistente: EMPRESA,
      dataNova: NOVA,
      dataExistente: BASE,
      statusExistente: "agendado",
      tipoAsoNovo: "",
      tipoAsoExistente: "Demissional",
    }),
    "permitir"
  );
});

if (failed > 0) process.exit(1);
console.log("\nagendamento-duplicidade-90dias: todos os testes passaram");
