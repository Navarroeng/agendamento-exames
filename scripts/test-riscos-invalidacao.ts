/**
 * Testes de invalidação administrativa e exclusão de sessões dos resultados.
 */
import assert from "node:assert/strict";
import {
  buildParticipantesResumo,
  type RiscosParticipanteStatus,
} from "../lib/riscos-campanha-participantes";
import {
  MOTIVO_INVALIDACAO_PADRAO,
  podeInvalidarParticipacao,
  podeRemoverParticipanteComum,
  sessaoContaNosResultados,
} from "../lib/riscos-invalidacao";
import {
  consolidarResultadosCampanha,
  filtrarSessoesConcluidasCampanha,
  type RespostaAvaliacaoConsolidacao,
} from "../lib/riscos-resultados";

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

run("TESTE 1: pendente pode remover comum", () => {
  assert.equal(podeRemoverParticipanteComum("pendente"), true);
  assert.equal(podeInvalidarParticipacao("pendente"), false);
});

run("TESTE 2: concluído bloqueia remoção comum e permite invalidar", () => {
  assert.equal(podeRemoverParticipanteComum("respondido"), false);
  assert.equal(podeInvalidarParticipacao("respondido"), true);
});

run("TESTE 3: invalidado não remove nem invalida de novo", () => {
  assert.equal(podeRemoverParticipanteComum("invalidado"), false);
  assert.equal(podeInvalidarParticipacao("invalidado"), false);
});

run("TESTE 4: sessão invalidada não conta nos resultados", () => {
  assert.equal(
    sessaoContaNosResultados({ status: "concluida", valida: true }),
    true
  );
  assert.equal(
    sessaoContaNosResultados({ status: "concluida", valida: false }),
    false
  );
  assert.equal(
    sessaoContaNosResultados({ status: "em_andamento", valida: true }),
    false
  );
});

run("TESTE 5/6: Respondidos e participação caem após invalidar", () => {
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
    sessoes: [
      { id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false },
    ],
    respostas: demandas,
  });
  assert.equal(depois.sessoesConcluidas, 0);
  assert.equal(depois.participacaoPercentual, 0);
  assert.equal(depois.pendentes, 10);
});

run("TESTE 7: dimensões recalculadas sem sessão invalidada", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
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
  assert.equal(demandasDim?.respondentesValidos, 1);
});

run("TESTE 8: filtro ignora inválidas de forma estável", () => {
  const filtradas = filtrarSessoesConcluidasCampanha(
    [
      { id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: false },
      { id: "s2", campanha_id: CAMPANHA, status: "concluida", valida: true },
      { id: "s3", campanha_id: CAMPANHA, status: "concluida" },
    ],
    CAMPANHA
  );
  assert.deepEqual(
    filtradas.map((s) => s.id).sort(),
    ["s2", "s3"]
  );
});

run("TESTE 9: motivo padrão de auditoria sem respostas", () => {
  assert.ok(MOTIVO_INVALIDACAO_PADRAO.includes("Invalidação administrativa"));
  assert.equal(/resposta|alternativa|p-\d/i.test(MOTIVO_INVALIDACAO_PADRAO), false);
});

run("TESTE 10: payload consolidado sem PII / respostas nominais", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA, status: "concluida", valida: true }],
    respostas: demandas,
  });
  const json = JSON.stringify(resultado);
  assert.equal(
    /"participante_id"|"cpf"|"nome_completo"|"data_nascimento"/i.test(json),
    false
  );
  assert.equal("respondentes" in resultado, false);
});

run("resumo administrativo: invalidado não conta como Responderam", () => {
  const resumo = buildParticipantesResumo(10, [
    { status: "pendente" as RiscosParticipanteStatus },
    { status: "respondido" as RiscosParticipanteStatus },
    { status: "invalidado" as RiscosParticipanteStatus },
  ]);
  assert.equal(resumo.cadastrados, 3);
  assert.equal(resumo.respondidos, 1);
  assert.equal(resumo.pendentes, 1);
  assert.equal(resumo.invalidados, 1);
});

console.log("\nTodos os testes de invalidação passaram.");
