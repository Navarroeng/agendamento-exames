/** Testes unitários leves da normalização de CNPJ (sem dependências). */

function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeCnpjDigits(value) {
  return onlyDigits(value);
}

function cnpjDigitsIguais(a, b) {
  const da = normalizeCnpjDigits(a);
  const db = normalizeCnpjDigits(b);
  if (!da || !db) return false;
  return da === db;
}

const CLIENTE_CNPJ_DUPLICADO_MSG =
  "Já existe um cliente cadastrado com este CNPJ.";

function resolveClienteCnpjError(error) {
  if (error instanceof Error && error.message === CLIENTE_CNPJ_DUPLICADO_MSG) {
    return CLIENTE_CNPJ_DUPLICADO_MSG;
  }
  if (
    error &&
    typeof error === "object" &&
    error.code === "23505"
  ) {
    return CLIENTE_CNPJ_DUPLICADO_MSG;
  }
  return null;
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

test("normaliza CNPJ com máscara", () => {
  if (normalizeCnpjDigits("45.206.250/0001-10") !== "45206250000110") {
    throw new Error("máscara não normalizada");
  }
});

test("CNPJs equivalentes", () => {
  if (!cnpjDigitsIguais("45.206.250/0001-10", "45206250000110")) {
    throw new Error("deveriam ser iguais");
  }
});

test("CNPJs diferentes", () => {
  if (cnpjDigitsIguais("45.206.250/0001-10", "45.206.250/0001-11")) {
    throw new Error("não deveriam ser iguais");
  }
});

test("mensagem de erro duplicado", () => {
  const msg = resolveClienteCnpjError(
    new Error(CLIENTE_CNPJ_DUPLICADO_MSG)
  );
  if (msg !== CLIENTE_CNPJ_DUPLICADO_MSG) {
    throw new Error("mensagem incorreta");
  }
});

test("violação unique do Postgres", () => {
  const msg = resolveClienteCnpjError({ code: "23505" });
  if (msg !== CLIENTE_CNPJ_DUPLICADO_MSG) {
    throw new Error("deveria mapear 23505");
  }
});

if (failed > 0) {
  process.exit(1);
}

console.log("\ncliente-cnpj: todos os testes passaram");
