/**
 * Status operacional do participante: Pendente → Iniciado → Concluído.
 */
import assert from "node:assert/strict";
import {
  calcularStatusParticipanteOperacional,
  deveAvancarParaIniciado,
  RISCOS_PARTICIPANTE_STATUS_LABELS,
  buildParticipantesResumo,
  type RiscosParticipanteStatus,
} from "../lib/riscos-campanha-participantes";
import { classificarSituacaoParticipante } from "../lib/avaliacao-retomada";
import { validarAcessoAvaliacao } from "../lib/avaliacao-validacao";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("0 respostas → Pendente", () => {
  assert.equal(
    calcularStatusParticipanteOperacional({ quantidadeRespostas: 0 }),
    "pendente"
  );
});

run("1 resposta → Iniciado", () => {
  assert.equal(
    calcularStatusParticipanteOperacional({ quantidadeRespostas: 1 }),
    "iniciado"
  );
});

run("10 respostas → Iniciado", () => {
  assert.equal(
    calcularStatusParticipanteOperacional({ quantidadeRespostas: 10 }),
    "iniciado"
  );
});

run("39 respostas → Iniciado", () => {
  assert.equal(
    calcularStatusParticipanteOperacional({ quantidadeRespostas: 39 }),
    "iniciado"
  );
});

run("todas + concluído → Concluído", () => {
  assert.equal(
    calcularStatusParticipanteOperacional({
      quantidadeRespostas: 41,
      concluido: true,
    }),
    "respondido"
  );
});

run("retomada com status iniciado permanece Iniciado", () => {
  assert.equal(
    calcularStatusParticipanteOperacional({
      quantidadeRespostas: 5,
      statusAtual: "iniciado",
    }),
    "iniciado"
  );
  assert.equal(deveAvancarParaIniciado("iniciado"), false);
  assert.equal(deveAvancarParaIniciado("pendente"), true);
  assert.equal(deveAvancarParaIniciado("respondido"), false);
});

run("nunca regride iniciado → pendente mesmo com 0 no cálculo sem status", () => {
  // Com statusAtual iniciado, 0 respostas (edge) ainda é iniciado.
  assert.equal(
    calcularStatusParticipanteOperacional({
      quantidadeRespostas: 0,
      statusAtual: "iniciado",
    }),
    "iniciado"
  );
});

run("label Iniciado", () => {
  assert.equal(RISCOS_PARTICIPANTE_STATUS_LABELS.iniciado, "Iniciado");
});

run("Responderam / cadastrados não mudam com iniciado", () => {
  const resumo = buildParticipantesResumo(10, [
    { status: "pendente" as RiscosParticipanteStatus },
    { status: "iniciado" as RiscosParticipanteStatus },
    { status: "iniciado" as RiscosParticipanteStatus },
    { status: "respondido" as RiscosParticipanteStatus },
  ]);
  assert.equal(resumo.cadastrados, 4);
  assert.equal(resumo.respondidos, 1);
  // iniciados entram no bucket operacional de não-concluídos (pendentes do resumo)
  assert.equal(resumo.pendentes, 3);
});

run("retomada portal: iniciado → em_andamento", () => {
  assert.equal(
    classificarSituacaoParticipante({
      statusParticipante: "iniciado",
      concluiuEm: null,
      iniciouEm: "2026-08-11T12:00:00.000Z",
      statusSessao: "em_andamento",
    }),
    "em_andamento"
  );
});

run("acesso: iniciado pode retomar", () => {
  const r = validarAcessoAvaliacao({
    codigoPublicoUrl: "ABC123",
    dataNascimentoIso: "1990-01-01",
    campanha: {
      id: "c1",
      codigo_publico: "ABC123",
      cliente_id: null,
      cnpj: "123",
      empresa_nome: "Empresa",
      status: "aberta",
      data_inicio: "2026-08-01",
      data_encerramento: "2026-08-31",
    },
    participante: {
      id: "p1",
      campanha_id: "c1",
      cpf: "52998224725",
      data_nascimento: "1990-01-01",
      nome_completo: "Teste",
      status: "iniciado",
      concluiu_em: null,
    },
    hojeIso: "2026-08-11",
  });
  assert.equal(r.ok, true);
});

console.log("\nTodos os testes de status Iniciado passaram.");
