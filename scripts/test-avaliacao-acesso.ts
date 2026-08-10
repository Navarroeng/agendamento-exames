import assert from "node:assert/strict";
import {
  createAvaliacaoSessionToken,
  criarHashCodigoAcessoCampanha,
  verificarCodigoAcessoCampanha,
  verifyAvaliacaoSessionToken,
} from "../lib/avaliacao-acesso";
import {
  assertCodigoPublicoSessao,
  validarAcessoAvaliacao,
  type CampanhaAcessoRow,
  type ParticipanteAcessoRow,
} from "../lib/avaliacao-validacao";

const hoje = "2026-08-10";

function campanhaBase(
  overrides: Partial<CampanhaAcessoRow> & {
    codigoPlain?: string;
  } = {}
): CampanhaAcessoRow & { codigoPlain: string } {
  const codigoPlain = overrides.codigoPlain ?? "NAV2026";
  const hashed = criarHashCodigoAcessoCampanha(codigoPlain);
  const { codigoPlain: _ignored, ...rest } = overrides;
  return {
    id: "camp-a",
    codigo_publico: "5UA22W",
    cliente_id: "cli-a",
    cnpj: "52618139002817",
    empresa_nome: "LEGRAND BRASIL LTDA",
    status: "aberta",
    data_inicio: "2026-08-01",
    data_encerramento: "2026-08-31",
    codigo_acesso_hash: hashed.hash,
    codigo_acesso_salt: hashed.salt,
    codigoPlain,
    ...rest,
  };
}

function participanteBase(
  overrides: Partial<ParticipanteAcessoRow> = {}
): ParticipanteAcessoRow {
  return {
    id: "part-joao",
    campanha_id: "camp-a",
    cpf: "52998224725",
    nome_completo: "João Silva",
    status: "pendente",
    concluiu_em: null,
    ...overrides,
  };
}

function run(
  name: string,
  fn: () => void
) {
  fn();
  console.log(`OK  ${name}`);
}

// Hash
run("hash verifica código correto", () => {
  const { salt, hash, exibicao } = criarHashCodigoAcessoCampanha("nav2026");
  assert.equal(exibicao, "NAV2026");
  assert.equal(verificarCodigoAcessoCampanha("NAV2026", salt, hash), true);
  assert.equal(verificarCodigoAcessoCampanha("ERRADO", salt, hash), false);
});

// Sessão
run("sessão assina e verifica", () => {
  const token = createAvaliacaoSessionToken({
    campanhaId: "camp-a",
    participanteId: "part-joao",
    codigoPublico: "5UA22W",
  });
  const parsed = verifyAvaliacaoSessionToken(token);
  assert.ok(parsed);
  assert.equal(parsed!.campanhaId, "camp-a");
  assert.equal(parsed!.codigoPublico, "5UA22W");
});

run("TESTE 8 sessão não aceita outra campanha na URL", () => {
  assert.equal(assertCodigoPublicoSessao("5UA22W", "5UA22W"), true);
  assert.equal(assertCodigoPublicoSessao("5UA22W", "OUTRA1"), false);
});

const campA = campanhaBase();
const joao = participanteBase();

run("TESTE 1 permitir campanha A + CPF A + código A", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    codigoAcessoInformado: campA.codigoPlain,
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, true);
});

run("TESTE 2 bloquear código errado", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    codigoAcessoInformado: "ERRADO1",
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "codigo_acesso_invalido");
});

run("TESTE 3 bloquear CPF de outra empresa (sem vínculo na campanha)", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    codigoAcessoInformado: campA.codigoPlain,
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
    codigoAcessoInformado: campA.codigoPlain,
    campanha: campA,
    participante: null,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
});

run("TESTE 5 bloquear código da campanha B", () => {
  const campB = campanhaBase({
    id: "camp-b",
    codigo_publico: "BBB111",
    codigoPlain: "CODIGOB",
  });
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    codigoAcessoInformado: campB.codigoPlain,
    campanha: campA,
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "codigo_acesso_invalido");
});

run("TESTE 6 bloquear campanha encerrada", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    codigoAcessoInformado: campA.codigoPlain,
    campanha: { ...campA, status: "encerrada" },
    participante: joao,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "campanha_indisponivel");
});

run("TESTE 7 bloquear participante que já concluiu", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    codigoAcessoInformado: campA.codigoPlain,
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

run("isolamento: participante com campanha_id divergente", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    codigoAcessoInformado: campA.codigoPlain,
    campanha: campA,
    participante: { ...joao, campanha_id: "outra" },
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_campanha_divergente");
});

console.log("\nTodos os testes de acesso à avaliação passaram.");
