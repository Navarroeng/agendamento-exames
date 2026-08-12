/**
 * Regras do relatório final de Riscos Psicossociais (V1).
 */
import assert from "node:assert/strict";
import {
  MSG_RELATORIO_CAMPANHA_CANCELADA,
  MSG_RELATORIO_JA_EXISTE,
  MSG_RELATORIO_PARTICIPANTES_PENDENTES,
  MSG_RELATORIO_SEM_PARTICIPANTES,
  montarResultadoJsonRelatorio,
  validatePodeGerarRelatorioFinal,
} from "../lib/riscos-relatorio";
import { consolidarResultadosCampanha } from "../lib/riscos-resultados";
import type { RiscosResultadosPublicos } from "../lib/riscos-resultados";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

run("sem participantes: bloqueia", () => {
  const msg = validatePodeGerarRelatorioFinal({
    campanhaStatus: "encerrada",
    participantesAtivos: [],
    jaExisteRelatorio: false,
  });
  assert.equal(msg, MSG_RELATORIO_SEM_PARTICIPANTES);
});

run("parcialmente respondida: bloqueia", () => {
  const msg = validatePodeGerarRelatorioFinal({
    campanhaStatus: "aberta",
    participantesAtivos: [
      { status: "respondido" },
      { status: "pendente" },
      { status: "iniciado" },
    ],
    jaExisteRelatorio: false,
  });
  assert.equal(msg, MSG_RELATORIO_PARTICIPANTES_PENDENTES);
});

run("campanha completa: libera", () => {
  const msg = validatePodeGerarRelatorioFinal({
    campanhaStatus: "encerrada",
    participantesAtivos: [
      { status: "respondido" },
      { status: "respondido" },
    ],
    jaExisteRelatorio: false,
  });
  assert.equal(msg, null);
});

run("campanha cancelada: bloqueia", () => {
  const msg = validatePodeGerarRelatorioFinal({
    campanhaStatus: "cancelada",
    participantesAtivos: [{ status: "respondido" }],
    jaExisteRelatorio: false,
  });
  assert.equal(msg, MSG_RELATORIO_CAMPANHA_CANCELADA);
});

run("já existe relatório: bloqueia nova geração", () => {
  const msg = validatePodeGerarRelatorioFinal({
    campanhaStatus: "encerrada",
    participantesAtivos: [{ status: "respondido" }],
    jaExisteRelatorio: true,
  });
  assert.equal(msg, MSG_RELATORIO_JA_EXISTE);
});

run("ignora removidos/invalidados no gate", () => {
  const msg = validatePodeGerarRelatorioFinal({
    campanhaStatus: "encerrada",
    participantesAtivos: [
      { status: "respondido" },
      { status: "removido" },
      { status: "invalidado" },
    ],
    jaExisteRelatorio: false,
  });
  assert.equal(msg, null);
});

run("montarResultadoJsonRelatorio: snapshot com placeholders", () => {
  const consolidado = {
    previstos: 10,
    sessoesConcluidas: 8,
    pendentes: 2,
    participacaoPercentual: 80,
    riscoGeralMensagem: "Atenção a dimensões críticas",
    dimensoes: [
      {
        id: "DT",
        nome: "Demandas de Trabalho",
        tipo: "risco",
        entraNoCalculo: true,
        media: 72.5,
        mediaBruta: 72.5,
        respondentesValidos: 8,
        classificacao: {
          id: "risco_para_saude",
          label: "Risco para a saúde",
          interpretacao: "Situação crítica",
        },
      },
      {
        id: "JC",
        nome: "Justiça Climática",
        tipo: "recurso",
        entraNoCalculo: true,
        media: 40,
        mediaBruta: 40,
        respondentesValidos: 8,
        classificacao: {
          id: "situacao_favoravel",
          label: "Situação favorável",
          interpretacao: "OK",
        },
      },
    ],
    comportamentosOfensivos: {
      disponivel: false,
      itens: [],
    },
  } as unknown as RiscosResultadosPublicos;

  const json = montarResultadoJsonRelatorio({
    empresaNome: "Empresa X",
    codigoPublico: "ABC123",
    dataInicio: "2026-01-01",
    dataEncerramento: "2026-01-31",
    consolidado,
  });

  assert.equal(json.versao, 2);
  assert.equal(json.capa.participantes, 10);
  assert.equal(json.capa.respondentes, 8);
  assert.equal(json.capa.taxaParticipacao, 80);
  assert.equal(json.resumoExecutivo.quantidadeDimensoes, 2);
  assert.equal(json.resumoExecutivo.dimensoesCriticas.length, 1);
  assert.equal(json.dimensoes[0].cor, "#dc2626");
  assert.equal(json.dimensoes[0].mediaBruta, 72.5);
  assert.equal(json.dimensoes[0].maxEscalaPadronizada, 4);
  assert.equal(json.conclusao, null);
  assert.equal(json.recomendacoes, null);
});

run("Interface Muito satisfeito: snapshot usa média padronizada na classificação", () => {
  const consolidado = consolidarResultadosCampanha({
    campanhaId: "c-iface",
    statusCampanha: "encerrada",
    quantidadeCadastrados: 1,
    sessoes: [
      { id: "s1", campanha_id: "c-iface", status: "concluida", valida: true },
    ],
    respostas: [
      {
        sessao_id: "s1",
        campanha_id: "c-iface",
        pergunta_id: "p-13",
        alternativa_id: "sat-muito-satisfeito",
      },
    ],
  });
  const json = montarResultadoJsonRelatorio({
    empresaNome: "Diag",
    codigoPublico: "IFACE",
    dataInicio: "2026-01-01",
    dataEncerramento: "2026-12-31",
    consolidado,
  });
  const snap = json.dimensoes.find(
    (d) => d.id === "interface-trabalho-individuo"
  )!;
  assert.equal(snap.mediaBruta, 3);
  assert.equal(snap.media, 3);
  assert.equal(snap.maxEscalaBruta, 3);
  assert.equal(snap.maxEscalaPadronizada, 3);
  assert.equal(snap.classificacaoId, "situacao_favoravel");
  assert.equal(snap.classificacaoLabel, "Situação Favorável");
});

console.log("\nTodos os testes do relatório passaram.");
