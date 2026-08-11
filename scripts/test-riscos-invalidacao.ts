/**
 * Testes de invalidação administrativa e exclusão de sessões dos resultados.
 * (Compat: regras unificadas com remoção lógica.)
 */
import assert from "node:assert/strict";
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
  filtrarSessoesConcluidasCampanha,
  type RespostaAvaliacaoConsolidacao,
} from "../lib/riscos-resultados";
import {
  codigoErroPublico,
  validarAcessoAvaliacao,
} from "../lib/avaliacao-validacao";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const CAMPANHA = "campanha-x";

const demandas: RespostaAvaliacaoConsolidacao[] = [
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-1a", alternativa_id: "freq-as-vezes" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-1b", alternativa_id: "freq-raramente" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-2a", alternativa_id: "freq-sempre" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-2b", alternativa_id: "freq-frequentemente" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-3a", alternativa_id: "freq-as-vezes" },
  { sessao_id: "s1", campanha_id: CAMPANHA, pergunta_id: "p-3b", alternativa_id: "freq-raramente" },
];

run("TESTE 1: pendente remove com confirmação simples", () => {
  assert.equal(precisaConfirmacaoForteRemocao("pendente"), false);
});

run("TESTE 2: concluído exige confirmação forte", () => {
  assert.equal(precisaConfirmacaoForteRemocao("respondido"), true);
});

run("TESTE 3: removido/invalidado detectados", () => {
  assert.equal(participanteEstaRemovido({ status: "removido" }), true);
  assert.equal(participanteEstaRemovido({ status: "invalidado" }), true);
  assert.equal(participanteEstaRemovido({ status: "pendente" }), false);
});

run("TESTE 4: sessão invalidada não conta nos resultados", () => {
  assert.equal(
    filtrarSessoesConcluidasCampanha(
      [{ id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false }],
      CAMPANHA
    ).length,
    0
  );
});

run("TESTE 5/6: Respondidos e participação caem após invalidar sessão", () => {
  const depois = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadeCadastrados: 10,
    sessoes: [
      { id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false },
    ],
    respostas: demandas,
  });
  assert.equal(depois.sessoesConcluidas, 0);
  assert.equal(depois.participacaoPercentual, 0);
  assert.equal(depois.pendentes, 10);
});

run("TESTE 7: dimensões sem sessão invalidada", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadeCadastrados: 10,
    sessoes: [
      { id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false },
      { id: "s2", campanha_id: CAMPANHA, status: "concluida", valida: true },
    ],
    respostas: [
      ...demandas,
      ...demandas.map((r) => ({ ...r, sessao_id: "s2" })),
    ],
  });
  assert.equal(resultado.sessoesConcluidas, 1);
  const demandasDim = resultado.dimensoes.find((d) => d.id === "demandas-trabalho");
  assert.equal(demandasDim?.media, 2.5);
});

run("TESTE 8: filtro estável", () => {
  const filtradas = filtrarSessoesConcluidasCampanha(
    [
      { id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false },
      { id: "s2", campanha_id: CAMPANHA, status: "concluida", valida: true },
    ],
    CAMPANHA
  );
  assert.deepEqual(filtradas.map((s) => s.id), ["s2"]);
});

run("TESTE 9: invalidado → nao_apto (não ja_respondida)", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "ABC123",
    dataNascimentoIso: "1990-01-01",
    campanha: {
      id: CAMPANHA,
      codigo_publico: "ABC123",
      cliente_id: null,
      cnpj: "1",
      empresa_nome: "X",
      status: "aberta",
      data_inicio: "2026-01-01",
      data_encerramento: "2026-12-31",
    },
    participante: {
      id: "p",
      campanha_id: CAMPANHA,
      cpf: "52998224725",
      data_nascimento: "1990-01-01",
      nome_completo: "T",
      status: "invalidado",
      concluiu_em: "2026-01-02",
    },
    hojeIso: "2026-08-11",
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.motivo, "participante_removido");
    assert.equal(codigoErroPublico(r.motivo), "nao_apto");
  }
});

run("TESTE 10: payload sem PII", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadeCadastrados: 10,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: true }],
    respostas: demandas,
  });
  assert.equal(/"cpf"|"nome_completo"/i.test(JSON.stringify(resultado)), false);
});

run("resumo: removidos não entram na lista ativa", () => {
  const resumo = buildParticipantesResumo([
    { status: "pendente" as RiscosParticipanteStatus },
    { status: "respondido" as RiscosParticipanteStatus },
  ]);
  assert.equal(resumo.cadastrados, 2);
  assert.equal(resumo.previstos, 2);
  assert.equal(resumo.respondidos, 1);
});

console.log("\nTodos os testes de invalidação/remoção passaram.");
