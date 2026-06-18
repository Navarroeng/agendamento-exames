/** Testes de normalização de texto para buscas e caixa alta. */

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function textMatchesSearch(haystack, query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(haystack).includes(normalizedQuery);
}

function formatUppercaseInput(value) {
  return String(value).toLocaleUpperCase("pt-BR");
}

function normalizeUppercaseField(value) {
  return formatUppercaseInput(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim();
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

test("ignora acentos na busca", () => {
  if (!textMatchesSearch("João Silva", "JOAO")) {
    throw new Error("deveria encontrar");
  }
});

test("ignora caixa na busca", () => {
  if (!textMatchesSearch("CLAUDIA", "claudia")) {
    throw new Error("deveria encontrar");
  }
});

test("ignora espacos extras na busca", () => {
  if (!textMatchesSearch("J A BRASIL", "j a brasil")) {
    throw new Error("deveria encontrar");
  }
});

test("caixa alta na digitacao", () => {
  if (formatUppercaseInput("joão da silva") !== "JOÃO DA SILVA") {
    throw new Error("deveria exibir maiúsculo");
  }
});

test("valor final salvo em caixa alta", () => {
  if (normalizeUppercaseField("  joão   da silva  ") !== "JOÃO DA SILVA") {
    throw new Error("deveria normalizar");
  }
});

test("auditoria compara valor final", () => {
  const oldNorm = normalizeUppercaseField("joão da silva");
  const newNorm = normalizeUppercaseField("JOÃO DA SILVA");
  if (oldNorm !== newNorm) {
    throw new Error("deveriam ser iguais após normalizar");
  }
});

if (failed > 0) {
  process.exit(1);
}

console.log("\ntext-normalize: todos os testes passaram");
