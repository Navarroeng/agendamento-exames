/**
 * Testes de remoção lógica + bloqueio de acesso + exclusão dos resultados.
 */
import assert from "node:assert/strict";
import {
  codigoErroPublico,
  validarAcessoAvaliacao,
  type CampanhaAcessoRow,
  type ParticipanteAcessoRow,
} from "../lib/avaliacao-validacao";
import {
  buildParticipantesResumo,
  type RiscosParticipanteStatus,
} from "../lib/riscos-campanha-participantes";
import {
  precisaConfirmacaoForteRemocao,
  participanteEstaRemovido,
} from "../lib/riscos-remocao-participante";
import {
  consolidarResultadosCampanha,
  type RespostaAvaliacaoConsolidacao,
} from "../lib/riscos-resultados";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const CAMPANHA = "campanha-a";
const hoje = "2026-08-11";

const campanha: CampanhaAcessoRow = {
  id: CAMPANHA,
  codigo_publico: "5UA22W",
  cliente_id: "cli",
  cnpj: "52618139002817",
  empresa_nome: "LEGRAND",
  status: "aberta",
  data_inicio: "2026-08-01",
  data_encerramento: "2026-08-31",
};

function part(
  overrides: Partial<ParticipanteAcessoRow> = {}
): ParticipanteAcessoRow {
  return {
    id: "p1",
    campanha_id: CAMPANHA,
    cpf: "52998224725",
    data_nascimento: "1990-05-15",
    nome_completo: "Wanderlei Almodovar",
    status: "pendente",
    concluiu_em: null,
    removido_em: null,
    ...overrides,
  };
}

const demandas: RespostaAvaliacaoConsolidacao[] = [
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-1a", alternativa_id: "freq-as-vezes" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-1b", alternativa_id: "freq-raramente" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-2a", alternativa_id: "freq-sempre" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-2b", alternativa_id: "freq-frequentemente" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-3a", alternativa_id: "freq-as-vezes" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-3b", alternativa_id: "freq-raramente" },
];

run("TESTE 1: pendente ativo acessa", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha,
    participante: part(),
    hojeIso: hoje,
  });
  assert.equal(r.ok, true);
});

run("TESTE 2: concluído ativo → ja_respondida", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha,
    participante: part({
      status: "respondido",
      concluiu_em: "2026-08-05T12:00:00.000Z",
    }),
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_ja_concluiu");
  assert.equal(codigoErroPublico("participante_ja_concluiu"), "ja_respondida");
});

run("TESTE 3/4: removido (Wanderlei) → nao_apto, nunca questionário", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha,
    participante: part({
      status: "removido",
      concluiu_em: "2026-08-05T12:00:00.000Z",
      removido_em: "2026-08-10T12:00:00.000Z",
    }),
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_removido");
  assert.equal(codigoErroPublico("participante_removido"), "nao_apto");
});

run("TESTE 4b: invalidado legado → nao_apto", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha,
    participante: part({
      status: "invalidado",
      concluiu_em: "2026-08-05T12:00:00.000Z",
    }),
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_removido");
  assert.equal(codigoErroPublico(r.ok ? "campanha_inexistente" : r.motivo), "nao_apto");
});

run("TESTE 5: sessão invalidada fora dos resultados", () => {
  const antes = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: true }],
    respostas: demandas,
  });
  assert.equal(antes.sessoesConcluidas, 1);
  assert.equal(antes.participacaoPercentual, 10);

  const depois = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false }],
    respostas: demandas,
  });
  assert.equal(depois.sessoesConcluidas, 0);
  assert.equal(depois.participacaoPercentual, 0);
});

run("TESTE 6: confirmação forte só para quem concluiu", () => {
  assert.equal(precisaConfirmacaoForteRemocao("pendente"), false);
  assert.equal(precisaConfirmacaoForteRemocao("respondido"), true);
});

run("TESTE 7: contadores após remoção (lista só ativos)", () => {
  const antes = buildParticipantesResumo(10, [
    { status: "respondido" as RiscosParticipanteStatus },
  ]);
  assert.equal(antes.cadastrados, 1);
  assert.equal(antes.respondidos, 1);

  const depois = buildParticipantesResumo(10, []);
  assert.equal(depois.cadastrados, 0);
  assert.equal(depois.respondidos, 0);
  assert.equal(depois.pendentes, 0);
});

run("TESTE 8: participanteEstaRemovido", () => {
  assert.equal(
    participanteEstaRemovido({ status: "pendente", removido_em: null }),
    false
  );
  assert.equal(
    participanteEstaRemovido({
      status: "respondido",
      removido_em: "2026-08-10",
    }),
    true
  );
  assert.equal(
    participanteEstaRemovido({ status: "invalidado", removido_em: null }),
    true
  );
});

run("TESTE 9: payload consolidado sem PII", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: true }],
    respostas: demandas,
  });
  const json = JSON.stringify(resultado);
  assert.equal(/"cpf"|"nome_completo"|"participante_id"/i.test(json), false);
});

run("TESTE 10: removido não encontrado na query → nao_apto genérico", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "5UA22W",
    dataNascimentoIso: "1990-05-15",
    campanha,
    participante: null,
    hojeIso: hoje,
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.motivo, "participante_nao_encontrado");
  assert.equal(codigoErroPublico("participante_nao_encontrado"), "nao_apto");
});

console.log("\nTodos os testes de remoção/bloqueio passaram.");
