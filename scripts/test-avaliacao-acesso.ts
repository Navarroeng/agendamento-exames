import assert from "node:assert/strict";
import {
  createAvaliacaoSessionToken,
  verifyAvaliacaoSessionToken,
} from "../lib/avaliacao-acesso";
import {
  assertCodigoPublicoSessao,
  validarAcessoAvaliacao,
  type CampanhaAcessoRow,
  type ParticipanteAcessoRow,
} from "../lib/avaliacao-validacao";
import { parseDataNascimentoBr } from "../lib/date-br";
import { isAvaliacaoDemoCodigo } from "../lib/avaliacao-demo";

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

run("parse data nascimento BR", () => {
  assert.equal(parseDataNascimentoBr("15/05/1990"), "1990-05-15");
  assert.equal(parseDataNascimentoBr("15051990"), "1990-05-15");
  assert.equal(parseDataNascimentoBr("31/02/1990"), null);
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

run("TESTE 7 sessão não aceita outra campanha na URL", () => {
  assert.equal(assertCodigoPublicoSessao("5UA22W", "5UA22W"), true);
  assert.equal(assertCodigoPublicoSessao("5UA22W", "OUTRA1"), false);
});

const campA = campanhaBase();
const joao = participanteBase();

run("TESTE 1 permitir CPF + nascimento corretos na campanha", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, true);
});

run("TESTE 2 bloquear nascimento errado", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1991-01-01",
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "data_nascimento_divergente");
});

run("TESTE 3 bloquear CPF de outra empresa (sem vínculo na campanha)", () => {
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

run("TESTE 4 bloquear CPF existente fora da campanha", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: null,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
});

run("TESTE 5 bloquear campanha encerrada", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: { ...campA, status: "encerrada" },
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "campanha_indisponivel");
});

run("TESTE 6 bloquear participante que já concluiu", () => {
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
});

run("TESTE 8 DEMO01 isolado", () => {
  assert.equal(isAvaliacaoDemoCodigo("DEMO01"), true);
  assert.equal(isAvaliacaoDemoCodigo("5UA22W"), false);
});

run("isolamento: participante com campanha_id divergente", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha: campA,
    participante: { ...joao, campanha_id: "outra" },
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_campanha_divergente");
});

console.log("\nTodos os testes de acesso (CPF + nascimento) passaram.");
