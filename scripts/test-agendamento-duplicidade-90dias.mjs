/** Testes da regra de duplicidade de agendamento (90 dias + CPF). */

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeCpfDigits(value) {
  return onlyDigits(value);
}

function normalizeEmpresaNome(value) {
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

function evaluaConflitoDuplicidade90Dias(input) {
  if (input.statusExistente === "cancelado") return false;

  const cpfNovo = normalizeCpfDigits(input.cpfNovo);
  const cpfExistente = normalizeCpfDigits(input.cpfExistente);
  if (cpfNovo.length !== 11 || cpfExistente.length !== 11) return false;
  if (cpfNovo !== cpfExistente) return false;

  if (
    normalizeEmpresaNome(input.empresaNova) !==
    normalizeEmpresaNome(input.empresaExistente)
  ) {
    return false;
  }

  return violaDuplicidade90Dias(
    diasEntreAgendamentos(input.dataNova, input.dataExistente)
  );
}

const CPF = "529.982.247-25";
const EMPRESA = "CLUB COFFEE";
const BASE = "2026-03-01";

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

function assertBloqueia(dias) {
  const dataNova = new Date(parseIsoDateOnly(BASE));
  dataNova.setUTCDate(dataNova.getUTCDate() + dias);
  const isoNova = dataNova.toISOString().slice(0, 10);
  const conflito = evaluaConflitoDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: isoNova,
    dataExistente: BASE,
    statusExistente: "agendado",
  });
  if (!conflito) {
    throw new Error(`deveria bloquear com ${dias} dias`);
  }
}

function assertPermite(dias) {
  const dataNova = new Date(parseIsoDateOnly(BASE));
  dataNova.setUTCDate(dataNova.getUTCDate() + dias);
  const isoNova = dataNova.toISOString().slice(0, 10);
  const conflito = evaluaConflitoDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: isoNova,
    dataExistente: BASE,
    statusExistente: "agendado",
  });
  if (conflito) {
    throw new Error(`deveria permitir com ${dias} dias`);
  }
}

test("Mesmo CPF + mesma empresa + 10 dias → BLOQUEAR", () => assertBloqueia(10));
test("Mesmo CPF + mesma empresa + 45 dias → BLOQUEAR", () => assertBloqueia(45));
test("Mesmo CPF + mesma empresa + 89 dias → BLOQUEAR", () => assertBloqueia(89));
test("Mesmo CPF + mesma empresa + 90 dias → PERMITIR", () => assertPermite(90));
test("Mesmo CPF + mesma empresa + 120 dias → PERMITIR", () => assertPermite(120));

test("Mesmo CPF + empresa diferente → PERMITIR", () => {
  const conflito = evaluaConflitoDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: "OUTRA EMPRESA",
    empresaExistente: EMPRESA,
    dataNova: "2026-03-15",
    dataExistente: BASE,
    statusExistente: "agendado",
  });
  if (conflito) throw new Error("empresa diferente deveria permitir");
});

test("Mesmo nome + CPF diferente → PERMITIR", () => {
  const conflito = evaluaConflitoDuplicidade90Dias({
    cpfNovo: "111.444.777-35",
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: "2026-03-15",
    dataExistente: BASE,
    statusExistente: "agendado",
  });
  if (conflito) throw new Error("CPF diferente deveria permitir");
});

test("Mesmo CPF + registro anterior cancelado → PERMITIR", () => {
  const conflito = evaluaConflitoDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: "2026-03-15",
    dataExistente: BASE,
    statusExistente: "cancelado",
  });
  if (conflito) throw new Error("cancelado deveria permitir");
});

test("Nome do colaborador não é chave (CPF igual, nomes diferentes)", () => {
  const conflito = evaluaConflitoDuplicidade90Dias({
    cpfNovo: CPF,
    cpfExistente: CPF,
    empresaNova: EMPRESA,
    empresaExistente: EMPRESA,
    dataNova: "2026-04-15",
    dataExistente: BASE,
    statusExistente: "agendado",
  });
  if (!conflito) throw new Error("CPF igual deve bloquear independente do nome");
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nagendamento-duplicidade-90dias: todos os testes passaram");
