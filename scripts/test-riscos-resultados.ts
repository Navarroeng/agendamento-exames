/**
 * Testes de consolidação das respostas reais → motor COPSOQ (card Resultados).
 * Sem PII; apenas sessões concluídas; isolamento por campanha.
 */
import assert from "node:assert/strict";
import { interpretarCampanhaCopsoq } from "../lib/copsoq-engine";
import {
  consolidarResultadosCampanha,
  filtrarSessoesConcluidasCampanha,
  montarRespondentesEngine,
  RISCO_GERAL_NAO_DEFINIDO,
  temResultadosConcluidos,
  type RespostaAvaliacaoConsolidacao,
  type SessaoAvaliacaoConsolidacao,
} from "../lib/riscos-resultados";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

const CAMPANHA_A = "campanha-a";
const CAMPANHA_B = "campanha-b";

const demandasCompletas: RespostaAvaliacaoConsolidacao[] = [
  { sessao_id: "s1", campanha_id: CAMPANHA_A, pergunta_id: "p-1a", alternativa_id: "freq-as-vezes" },
  { sessao_id: "s1", campanha_id: CAMPANHA_A, pergunta_id: "p-1b", alternativa_id: "freq-raramente" },
  { sessao_id: "s1", campanha_id: CAMPANHA_A, pergunta_id: "p-2a", alternativa_id: "freq-sempre" },
  { sessao_id: "s1", campanha_id: CAMPANHA_A, pergunta_id: "p-2b", alternativa_id: "freq-frequentemente" },
  { sessao_id: "s1", campanha_id: CAMPANHA_A, pergunta_id: "p-3a", alternativa_id: "freq-as-vezes" },
  { sessao_id: "s1", campanha_id: CAMPANHA_A, pergunta_id: "p-3b", alternativa_id: "freq-raramente" },
];

// ---------------------------------------------------------------------------
// TESTE 1 — Nenhuma sessão concluída → vazio
// ---------------------------------------------------------------------------
run("TESTE 1: nenhuma sessão concluída → sessoesConcluidas = 0", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA_A,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [
      { id: "s-andamento", campanha_id: CAMPANHA_A, status: "em_andamento" },
    ],
    respostas: [
      {
        sessao_id: "s-andamento",
        campanha_id: CAMPANHA_A,
        pergunta_id: "p-1a",
        alternativa_id: "freq-sempre",
      },
    ],
  });
  assert.equal(resultado.sessoesConcluidas, 0);
  assert.equal(temResultadosConcluidos(resultado), false);
  assert.equal(resultado.dimensoes.every((d) => d.respondentesValidos === 0), true);
});

// ---------------------------------------------------------------------------
// TESTE 2 — 1 sessão concluída → resultado calculado
// ---------------------------------------------------------------------------
run("TESTE 2: 1 sessão concluída → Demandas média 2,5", () => {
  const sessoes: SessaoAvaliacaoConsolidacao[] = [
    { id: "s1", campanha_id: CAMPANHA_A, status: "concluida" },
  ];
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA_A,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes,
    respostas: demandasCompletas,
  });
  assert.equal(resultado.sessoesConcluidas, 1);
  assert.equal(temResultadosConcluidos(resultado), true);
  const demandas = resultado.dimensoes.find((d) => d.id === "demandas-trabalho");
  assert.ok(demandas);
  assert.equal(demandas!.media, 2.5);
  assert.equal(demandas!.classificacao.id, "risco_intermediario");
  assert.equal(demandas!.respondentesValidos, 1);
  assert.equal(resultado.participacaoPercentual, 10); // 1/10
  assert.equal(resultado.pendentes, 9);
});

// ---------------------------------------------------------------------------
// TESTE 3 — Sessão em andamento não entra
// ---------------------------------------------------------------------------
run("TESTE 3: sessão em andamento não entra no cálculo", () => {
  const filtradas = filtrarSessoesConcluidasCampanha(
    [
      { id: "s1", campanha_id: CAMPANHA_A, status: "concluida" },
      { id: "s2", campanha_id: CAMPANHA_A, status: "em_andamento" },
    ],
    CAMPANHA_A
  );
  assert.equal(filtradas.length, 1);
  assert.equal(filtradas[0]!.id, "s1");

  const respondentes = montarRespondentesEngine({
    campanhaId: CAMPANHA_A,
    sessoes: [
      { id: "s1", campanha_id: CAMPANHA_A, status: "concluida" },
      { id: "s2", campanha_id: CAMPANHA_A, status: "em_andamento" },
    ],
    respostas: [
      ...demandasCompletas,
      {
        sessao_id: "s2",
        campanha_id: CAMPANHA_A,
        pergunta_id: "p-1a",
        alternativa_id: "freq-sempre",
      },
    ],
  });
  assert.equal(respondentes.length, 1);
  assert.equal(Object.keys(respondentes[0]!).length, 6);
});

// ---------------------------------------------------------------------------
// TESTE 4 — Isolamento entre campanhas
// ---------------------------------------------------------------------------
run("TESTE 4: Campanha A não recebe respostas da Campanha B", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA_A,
    statusCampanha: "aberta",
    quantidadePrevista: 5,
    sessoes: [
      { id: "sA", campanha_id: CAMPANHA_A, status: "concluida" },
      { id: "sB", campanha_id: CAMPANHA_B, status: "concluida" },
    ],
    respostas: [
      ...demandasCompletas.map((r) => ({ ...r, sessao_id: "sA" })),
      {
        sessao_id: "sB",
        campanha_id: CAMPANHA_B,
        pergunta_id: "p-1a",
        alternativa_id: "freq-sempre",
      },
      {
        sessao_id: "sB",
        campanha_id: CAMPANHA_B,
        pergunta_id: "p-1b",
        alternativa_id: "freq-sempre",
      },
    ],
  });
  assert.equal(resultado.sessoesConcluidas, 1);
  const demandas = resultado.dimensoes.find((d) => d.id === "demandas-trabalho");
  assert.equal(demandas!.media, 2.5);
});

// ---------------------------------------------------------------------------
// TESTE 5 — Resultado = retorno do engine
// ---------------------------------------------------------------------------
run("TESTE 5: resultado público espelha o engine", () => {
  const sessoes = [
    { id: "s1", campanha_id: CAMPANHA_A, status: "concluida" },
  ];
  const respostas = demandasCompletas;
  const publico = consolidarResultadosCampanha({
    campanhaId: CAMPANHA_A,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes,
    respostas,
  });
  const engine = interpretarCampanhaCopsoq({
    respondentes: montarRespondentesEngine({
      campanhaId: CAMPANHA_A,
      sessoes,
      respostas,
    }),
    baseParticipacao: 10,
  });

  assert.equal(publico.engine.riscoGeral, engine.riscoGeral);
  assert.deepEqual(
    publico.dimensoes.map((d) => ({
      id: d.id,
      media: d.media,
      classificacao: d.classificacao.id,
      validos: d.respondentesValidos,
    })),
    engine.dimensoes.map((d) => ({
      id: d.id,
      media: d.media,
      classificacao: d.classificacao.id,
      validos: d.respondentesValidos,
    }))
  );
  assert.equal(
    publico.participacaoPercentual,
    engine.participacao.percentual
  );
});

// ---------------------------------------------------------------------------
// TESTE 6 — Comportamentos Ofensivos fora da média/classificação
// ---------------------------------------------------------------------------
run("TESTE 6: ofensivos qualitativos sem média/classificação", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA_A,
    statusCampanha: "aberta",
    quantidadePrevista: 1,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA_A, status: "concluida" }],
    respostas: [
      ...demandasCompletas,
      {
        sessao_id: "s1",
        campanha_id: CAMPANHA_A,
        pergunta_id: "p-20",
        alternativa_id: "exp-nao",
      },
    ],
  });
  assert.equal(
    resultado.dimensoes.some((d) => d.id === "comportamentos-ofensivos"),
    false
  );
  assert.equal(resultado.comportamentosOfensivos.media, null);
  assert.equal(resultado.comportamentosOfensivos.classificacao, null);
  assert.equal(resultado.comportamentosOfensivos.titulo, "Comportamentos Ofensivos");
  assert.ok(resultado.comportamentosOfensivos.itens.length >= 1);
});

// ---------------------------------------------------------------------------
// TESTE 7 — riscoGeral null (frontend não inventa)
// ---------------------------------------------------------------------------
run("TESTE 7: riscoGeral permanece null com mensagem oficial", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA_A,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA_A, status: "concluida" }],
    respostas: demandasCompletas,
  });
  assert.equal(resultado.riscoGeral, null);
  assert.equal(resultado.riscoGeralMensagem, RISCO_GERAL_NAO_DEFINIDO);
  assert.equal(resultado.engine.riscoGeral, null);
});

// ---------------------------------------------------------------------------
// TESTE 8 — Nenhuma informação nominal
// ---------------------------------------------------------------------------
run("TESTE 8: payload sem campos nominais (nome/CPF/participante)", () => {
  const resultado = consolidarResultadosCampanha({
    campanhaId: CAMPANHA_A,
    statusCampanha: "aberta",
    quantidadePrevista: 10,
    sessoes: [{ id: "s1", campanha_id: CAMPANHA_A, status: "concluida" }],
    respostas: demandasCompletas,
  });
  const json = JSON.stringify(resultado);
  // Campos de identidade — dimensão.nome do instrumento não é PII
  assert.equal(
    /"participante_id"|"cpf"|"data_nascimento"|"nome_completo"|"email"|"telefone"/i.test(
      json
    ),
    false
  );
  assert.equal("respondentes" in resultado, false);
  assert.ok(!("sessoes" in resultado));
  assert.ok(!("vinculos" in resultado));
});

console.log("\nTodos os testes de consolidação COPSOQ passaram.");
