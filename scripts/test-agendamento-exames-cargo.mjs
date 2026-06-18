/** Testes da regra de exames por cargo no agendamento. */

function hasCargoSelecionado(cargoId) {
  return String(cargoId ?? "").trim() !== "";
}

function getExamesValidosAgendamento(exams) {
  return exams.filter((exam) => exam.tipo_exame.trim() && !exam.aviso);
}

function hasExamesObrigatoriosCarregados(exams) {
  return getExamesValidosAgendamento(exams).length > 0;
}

function cargoSemExamesVinculados(cargoId, exams, loading = false) {
  if (!hasCargoSelecionado(cargoId) || loading) return false;
  return !hasExamesObrigatoriosCarregados(exams);
}

function podeSalvarAgendamento(cargoId, exams) {
  return hasCargoSelecionado(cargoId) && hasExamesObrigatoriosCarregados(exams);
}

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

const examesCargo = [
  { tipo_exame: "Hemograma", aviso: "" },
  { tipo_exame: "ASO", aviso: "" },
];

test("cargo com exames permite salvar", () => {
  if (!podeSalvarAgendamento("cargo-1", examesCargo)) {
    throw new Error("deveria permitir");
  }
});

test("sem cargo bloqueia salvar", () => {
  if (podeSalvarAgendamento("", examesCargo)) {
    throw new Error("deveria bloquear");
  }
});

test("cargo sem exames bloqueia salvar", () => {
  if (podeSalvarAgendamento("cargo-1", [])) {
    throw new Error("deveria bloquear");
  }
});

test("cargo sem exames exibe alerta", () => {
  if (!cargoSemExamesVinculados("cargo-1", [])) {
    throw new Error("deveria exibir alerta");
  }
});

test("remover exame reduz lista mas ainda pode salvar se restar exame", () => {
  const restantes = [examesCargo[0]];
  if (!podeSalvarAgendamento("cargo-1", restantes)) {
    throw new Error("deveria permitir com 1 exame");
  }
});

test("remover todos os exames bloqueia salvar", () => {
  if (podeSalvarAgendamento("cargo-1", [])) {
    throw new Error("deveria bloquear sem exames");
  }
});

test("exame com aviso não conta como válido", () => {
  const exams = [{ tipo_exame: "RX", aviso: "Clínica não realiza" }];
  if (podeSalvarAgendamento("cargo-1", exams)) {
    throw new Error("exame com aviso não deveria contar");
  }
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nagendamento-exames-cargo: todos os testes passaram");
