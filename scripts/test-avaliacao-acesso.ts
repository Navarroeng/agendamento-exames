import assert from "node:assert/strict";
import {
  createAvaliacaoSessionToken,
  verifyAvaliacaoSessionToken,
} from "../lib/avaliacao-acesso";
import {
  assertCodigoPublicoSessao,
  codigoErroPublico,
  validarAcessoAvaliacao,
  type CampanhaAcessoRow,
  type ParticipanteAcessoRow,
} from "../lib/avaliacao-validacao";
import {
  datasNascimentoIguais,
  parseDataNascimentoBr,
} from "../lib/date-br";
import { normalizeCpfDigits, isValidCPF } from "../lib/cpf";
import { isAvaliacaoDemoCodigo } from "../lib/avaliacao-demo";

if (!process.env.AVALIACAO_SESSION_SECRET?.trim()) {
  process.env.AVALIACAO_SESSION_SECRET = "test-avaliacao-session-secret";
}

const hoje = "2026-08-10";

function campanhaBase(
  overrides: Partial<CampanhaAcessoRow> = {}
): CampanhaAcessoRow {
  return {
    id: "camp-a",
    codigo_publico: "5UA22W",
    cliente_id: "cli-a",
    cnpj: "52618139002817",
    empresa_nome: "LEGRAND BRASIL LTDA",
    status: "aberta",
    data_inicio: "2026-08-01",
    data_encerramento: "2026-08-31",
    ...overrides,
  };
}

function participanteBase(
  overrides: Partial<ParticipanteAcessoRow> = {}
): ParticipanteAcessoRow {
  return {
    id: "part-joao",
    campanha_id: "camp-a",
    cpf: "52998224725",
    data_nascimento: "1990-05-15",
    nome_completo: "João Silva",
    status: "pendente",
    concluiu_em: null,
    ...overrides,
  };
}

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("parse data nascimento BR / ISO / dígitos", () => {
  assert.equal(parseDataNascimentoBr("15/05/1990"), "1990-05-15");
  assert.equal(parseDataNascimentoBr("15051990"), "1990-05-15");
  assert.equal(parseDataNascimentoBr("1990-05-15"), "1990-05-15");
  assert.equal(parseDataNascimentoBr("06/04/1991"), "1991-04-06");
  assert.equal(parseDataNascimentoBr("1991-04-06"), "1991-04-06");
  assert.equal(parseDataNascimentoBr("31/02/1990"), null);
  assert.equal(
    datasNascimentoIguais("06/04/1991", "1991-04-06"),
    true
  );
  assert.equal(
    datasNascimentoIguais("1991-04-06T00:00:00.000Z", "1991-04-06"),
    true
  );
});

run("CPF máscara e sem máscara normalizam igual", () => {
  assert.equal(normalizeCpfDigits("373.850.608-03"), "37385060803");
  assert.equal(normalizeCpfDigits("37385060803"), "37385060803");
  assert.equal(
    normalizeCpfDigits("373.850.608-03"),
    normalizeCpfDigits("37385060803")
  );
});

run("sessão assina e verifica", () => {
  const token = createAvaliacaoSessionToken({
    campanhaId: "camp-a",
    participanteId: "part-joao",
    codigoPublico: "5UA22W",
  });
  const parsed = verifyAvaliacaoSessionToken(token);
  assert.ok(parsed);
  assert.equal(parsed!.campanhaId, "camp-a");
});

run("sessão exige AVALIACAO_SESSION_SECRET", () => {
  const prev = process.env.AVALIACAO_SESSION_SECRET;
  delete process.env.AVALIACAO_SESSION_SECRET;
  try {
    assert.throws(
      () =>
        createAvaliacaoSessionToken({
          campanhaId: "camp-a",
          participanteId: "part-joao",
          codigoPublico: "5UA22W",
        }),
      /AVALIACAO_SESSION_SECRET/
    );
  } finally {
    if (prev == null) delete process.env.AVALIACAO_SESSION_SECRET;
    else process.env.AVALIACAO_SESSION_SECRET = prev;
  }
});

run("sessão não aceita outra campanha na URL", () => {
  assert.equal(assertCodigoPublicoSessao("5UA22W", "5UA22W"), true);
  assert.equal(assertCodigoPublicoSessao("5UA22W", "OUTRA1"), false);
});

const campA = campanhaBase();
const joao = participanteBase();

run("TESTE 1 CPF correto + nascimento correto + pendente → acesso", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: parseDataNascimentoBr("15/05/1990"),
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, true);
});

run("TESTE 1b portal envia ISO (bug corrigido) → acesso", () => {
  // Portal faz parse client-side e envia YYYY-MM-DD à API.
  const fromPortal = parseDataNascimentoBr("1990-05-15");
  assert.equal(fromPortal, "1990-05-15");
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: fromPortal,
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, true);
});

run("TESTE 2 CPF correto + nascimento errado → negado", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1991-01-01",
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "data_nascimento_divergente");
  assert.equal(codigoErroPublico("data_nascimento_divergente"), "nao_apto");
});

run("TESTE 3 CPF inexistente na campanha → negado", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: null,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_nao_encontrado");
});

run("TESTE 4 CPF de outra campanha → negado", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: null, // query é campanha_id + cpf — não encontra
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_nao_encontrado");

  const r2 = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: { ...joao, campanha_id: "camp-b" },
    hojeIso: hoje,
  });
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.equal(r2.motivo, "participante_campanha_divergente");
});

run("TESTE 5 participante concluído → ja_respondida", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: {
      ...joao,
      status: "respondido",
      concluiu_em: "2026-08-05T12:00:00.000Z",
    },
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_ja_concluiu");
  assert.equal(codigoErroPublico("participante_ja_concluiu"), "ja_respondida");
});

run("TESTE 5b participante removido/invalidado → nao_apto", () => {
  for (const status of ["removido", "invalidado"] as const) {
    const r = validarAcessoAvaliacao({
      codigoPublicoUrl: "5UA22W",
      dataNascimentoIso: "1990-05-15",
      campanha: campA,
      participante: {
        ...joao,
        status,
        concluiu_em: "2026-08-05T12:00:00.000Z",
        removido_em: status === "removido" ? "2026-08-10T00:00:00.000Z" : null,
      },
      hojeIso: hoje,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.motivo, "participante_removido");
    assert.equal(codigoErroPublico("participante_removido"), "nao_apto");
  }
});

run("TESTE 6 campanha encerrada → negado", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: { ...campA, status: "encerrada" },
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "campanha_encerrada");
});

run("TESTE 6b campanha após data de encerramento → negado", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: joao,
    hojeIso: "2026-09-01",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "campanha_encerrada");
});

run("TESTE 7 CPF com máscara e sem máscara", () => {
  const masked = "529.982.247-25";
  const plain = "52998224725";
  assert.equal(normalizeCpfDigits(masked), plain);
  assert.equal(isValidCPF(masked), isValidCPF(plain));
  assert.equal(isValidCPF(plain), true);
});

run("TESTE 8 DD/MM/AAAA compara com DATE do banco", () => {
  const digitado = parseDataNascimentoBr("15/05/1990");
  const banco = "1990-05-15";
  assert.equal(digitado, banco);
  assert.equal(datasNascimentoIguais(digitado, banco), true);
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: digitado,
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, true);
});

run("status Pendente (admin) = pendente aceito", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: { ...joao, status: "pendente" },
    hojeIso: hoje,
  });
  assert.equal(r.ok, true);
});

run("DEMO01 isolado", () => {
  assert.equal(isAvaliacaoDemoCodigo("DEMO01"), true);
  assert.equal(isAvaliacaoDemoCodigo("5UA22W"), false);
});

console.log("\nTodos os testes de acesso (CPF + nascimento) passaram.");
