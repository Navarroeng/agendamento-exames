/** Testes da ordenação de exames no agendamento (Clínico primeiro). */

function normalizeExameNome(nome) {
  return String(nome ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isExameClinicoManual(nome) {
  return normalizeExameNome(nome) === normalizeExameNome("Clínico");
}

function ordenarExamesAgendamentoComClinicoPrimeiro(exames) {
  if (exames.length <= 1) return exames;
  if (!exames.some((exame) => isExameClinicoManual(exame.tipo_exame))) {
    return exames;
  }
  return [...exames].sort((a, b) => {
    const aClinico = isExameClinicoManual(a.tipo_exame);
    const bClinico = isExameClinicoManual(b.tipo_exame);
    if (aClinico && !bClinico) return -1;
    if (!aClinico && bClinico) return 1;
    return 0;
  });
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

test("Clínico aparece primeiro entre complementares", () => {
  const input = [
    { tipo_exame: "Audiometria" },
    { tipo_exame: "Clínico" },
    { tipo_exame: "ECG" },
    { tipo_exame: "Glicemia" },
  ];
  const sorted = ordenarExamesAgendamentoComClinicoPrimeiro(input);
  if (sorted[0].tipo_exame !== "Clínico") {
    throw new Error("Clínico deveria ser o primeiro");
  }
  if (sorted.map((e) => e.tipo_exame).join("|") !== "Clínico|Audiometria|ECG|Glicemia") {
    throw new Error("ordem relativa dos demais deveria ser mantida");
  }
});

test("sem Clínico mantém ordem original", () => {
  const input = [
    { tipo_exame: "Audiometria" },
    { tipo_exame: "ECG" },
  ];
  const sorted = ordenarExamesAgendamentoComClinicoPrimeiro(input);
  if (sorted[0].tipo_exame !== "Audiometria" || sorted[1].tipo_exame !== "ECG") {
    throw new Error("ordem deveria permanecer igual");
  }
});

test("Clínico no meio do cargo vai para o topo", () => {
  const input = [
    { tipo_exame: "EEG" },
    { tipo_exame: "Acuidade Visual" },
    { tipo_exame: "Clínico" },
    { tipo_exame: "Audiometria" },
  ];
  const sorted = ordenarExamesAgendamentoComClinicoPrimeiro(input);
  if (sorted[0].tipo_exame !== "Clínico") {
    throw new Error("Clínico deveria ser o primeiro");
  }
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nagendamento-exames-order: todos os testes passaram");
