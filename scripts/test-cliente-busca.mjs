/** Testes da montagem de filtros de busca de clientes (sem dependências). */

function escapeIlikeTerm(value) {
  return value.replace(/[\\%_,]/g, (char) => `\\${char}`);
}

function buildCnpjDigitSequencePattern(digits) {
  if (!digits) return "";
  const parts = digits.split("").map((digit) => escapeIlikeTerm(digit));
  return `%${parts.join("%")}%`;
}

function buildClienteBuscaOrFilters(busca, options = {}) {
  const useCnpjDigitsColumn = options.useCnpjDigitsColumn ?? true;
  const trimmed = busca.trim();
  if (!trimmed) return [];

  const escaped = escapeIlikeTerm(trimmed);
  const pattern = `%${escaped}%`;
  const digits = trimmed.replace(/\D/g, "");

  const filters = [
    `nome.ilike.${pattern}`,
    `email.ilike.${pattern}`,
    `telefone.ilike.${pattern}`,
    `contato.ilike.${pattern}`,
    `cnpj.ilike.${pattern}`,
  ];

  if (digits.length >= 2) {
    if (useCnpjDigitsColumn) {
      filters.push(`cnpj_digits.ilike.%${escapeIlikeTerm(digits)}%`);
    } else {
      filters.push(`cnpj.ilike.${buildCnpjDigitSequencePattern(digits)}`);
    }
  }

  return filters;
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

test("CNPJ completo sem máscara usa cnpj_digits", () => {
  const filters = buildClienteBuscaOrFilters("33476248000182");
  if (!filters.some((f) => f === "cnpj_digits.ilike.%33476248000182%")) {
    throw new Error("filtro cnpj_digits ausente");
  }
});

test("CNPJ com máscara inclui cnpj.ilike e cnpj_digits", () => {
  const filters = buildClienteBuscaOrFilters("33.476.248/0001-82");
  if (!filters.some((f) => f.includes("cnpj.ilike.%33.476.248/0001-82%"))) {
    throw new Error("filtro cnpj mascarado ausente");
  }
  if (!filters.some((f) => f === "cnpj_digits.ilike.%33476248000182%")) {
    throw new Error("filtro cnpj_digits ausente");
  }
});

test("parte do CNPJ usa cnpj_digits", () => {
  const filters = buildClienteBuscaOrFilters("33476248");
  if (!filters.some((f) => f === "cnpj_digits.ilike.%33476248%")) {
    throw new Error("filtro parcial ausente");
  }
});

test("parte do CNPJ com máscara normaliza dígitos", () => {
  const filters = buildClienteBuscaOrFilters("0001-82");
  if (!filters.some((f) => f === "cnpj_digits.ilike.%000182%")) {
    throw new Error("filtro parcial mascarado ausente");
  }
});

test("fallback sem cnpj_digits usa curingas no cnpj mascarado", () => {
  const filters = buildClienteBuscaOrFilters("33476248", {
    useCnpjDigitsColumn: false,
  });
  if (!filters.some((f) => f === "cnpj.ilike.%3%3%4%7%6%2%4%8%")) {
    throw new Error("fallback com curingas ausente");
  }
  if (filters.some((f) => f.includes("cnpj_digits"))) {
    throw new Error("não deveria usar cnpj_digits no fallback");
  }
});

test("busca por nome mantém filtro nome", () => {
  const filters = buildClienteBuscaOrFilters("Navarro");
  if (!filters.some((f) => f === "nome.ilike.%Navarro%")) {
    throw new Error("filtro nome ausente");
  }
});

if (failed > 0) {
  process.exit(1);
}

console.log("\ncliente-busca: todos os testes passaram");
