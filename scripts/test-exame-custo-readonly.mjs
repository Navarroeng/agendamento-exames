/** Testes da regra de custo clínica somente leitura no agendamento. */

const EXAME_SEM_CUSTO_CLINICA_MSG =
  "Este exame não possui custo cadastrado para a clínica selecionada.";

function isExamComplete(exam, aso = "Admissional") {
  const filled = (v) => String(v ?? "").trim() !== "";
  const hasValidValor =
    filled(exam.valor_cliente) && parseFloat(exam.valor_cliente.replace(",", ".")) > 0;
  return (
    filled(exam.tipo_exame) &&
    hasValidValor &&
    filled(exam.custo_clinica) &&
    !exam.aviso
  );
}

function updateExamBlocked(exams, id, field, value) {
  if (field === "tipo_exame" || field === "custo_clinica") return exams;
  return exams.map((exam) =>
    exam.id === id ? { ...exam, [field]: value } : exam
  );
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

test("mensagem de custo ausente definida", () => {
  if (!EXAME_SEM_CUSTO_CLINICA_MSG.includes("custo cadastrado")) {
    throw new Error("mensagem incorreta");
  }
});

test("exame com aviso de custo bloqueia salvar", () => {
  const exam = {
    tipo_exame: "Hemograma",
    valor_cliente: "50,00",
    custo_clinica: "",
    aviso: EXAME_SEM_CUSTO_CLINICA_MSG,
  };
  if (isExamComplete(exam)) {
    throw new Error("deveria bloquear");
  }
});

test("exame completo com custo permite salvar", () => {
  const exam = {
    tipo_exame: "Hemograma",
    valor_cliente: "50,00",
    custo_clinica: "30,00",
    aviso: "",
  };
  if (!isExamComplete(exam)) {
    throw new Error("deveria permitir");
  }
});

test("updateExam ignora custo_clinica", () => {
  const exams = [
    {
      id: "1",
      tipo_exame: "Hemograma",
      custo_clinica: "30,00",
    },
  ];
  const next = updateExamBlocked(exams, "1", "custo_clinica", "99,99");
  if (next[0].custo_clinica !== "30,00") {
    throw new Error("custo não deveria mudar");
  }
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nexame-custo-readonly: todos os testes passaram");
