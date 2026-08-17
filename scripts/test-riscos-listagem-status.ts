/**
 * Filtro STATUS (Aberto / Concluído) e ordenação da listagem de Riscos.
 * Executar: npx tsx scripts/test-riscos-listagem-status.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_RISCOS_LISTAGEM_STATUS,
  filterRiscosPsicossociaisProcessosPorMes,
  filterRiscosPsicossociaisProcessosPorStatus,
  isRiscosProcessoListagemConcluido,
  sortRiscosPsicossociaisProcessosListagem,
  type RiscosPsicossociaisProcesso,
} from "../lib/riscos-psicossociais";

const root = join(__dirname, "..");

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function processo(
  overrides: {
    cliente: string;
    status?: RiscosPsicossociaisProcesso["status"];
    etapaAtual?: RiscosPsicossociaisProcesso["etapaAtual"];
    etapasConcluidas: number;
    totalEtapas: number;
    progressoPercentual: number;
    dataEntrada: string | null;
    concluidoEm?: string | null;
  }
): RiscosPsicossociaisProcesso {
  return {
    processoKey: overrides.cliente,
    origem: "orcamento",
    exigeLaudosSst: true,
    implantacao: {
      orcamento: {
        cliente_nome: overrides.cliente,
        numero: overrides.cliente,
      },
    },
    etapaAtual: overrides.etapaAtual ?? "lista_presenca",
    etapasConcluidas: overrides.etapasConcluidas,
    totalEtapas: overrides.totalEtapas,
    progressoPercentual: overrides.progressoPercentual,
    status: overrides.status ?? "em_andamento",
    dataEntrada: overrides.dataEntrada,
    concluidoEm: overrides.concluidoEm ?? null,
  } as RiscosPsicossociaisProcesso;
}

const alAssessoria = processo({
  cliente: "AL ASSESSORIA",
  etapasConcluidas: 3,
  totalEtapas: 5,
  progressoPercentual: 60,
  dataEntrada: "2026-08-10T12:00:00Z",
  etapaAtual: "aguardando_respostas",
});

const zeroA = processo({
  cliente: "ZERO A",
  etapasConcluidas: 0,
  totalEtapas: 5,
  progressoPercentual: 0,
  dataEntrada: "2026-08-01T12:00:00Z",
});

const zeroB = processo({
  cliente: "ZERO B",
  etapasConcluidas: 0,
  totalEtapas: 6,
  progressoPercentual: 0,
  dataEntrada: "2026-08-12T12:00:00Z",
});

const navarro = processo({
  cliente: "NAVARRO ENGENHARIA",
  status: "concluido",
  etapaAtual: "finalizado",
  etapasConcluidas: 5,
  totalEtapas: 5,
  progressoPercentual: 100,
  dataEntrada: "2026-08-05T12:00:00Z",
  concluidoEm: "2026-08-20T12:00:00Z",
});

const todos = [zeroA, navarro, alAssessoria, zeroB];

run("padrão da listagem é Aberto", () => {
  assert.equal(DEFAULT_RISCOS_LISTAGEM_STATUS, "aberto");
});

run("Aberto exclui Finalizado/100% e inclui 0–N etapas", () => {
  const abertos = filterRiscosPsicossociaisProcessosPorStatus(todos, "aberto");
  assert.deepEqual(
    abertos.map((p) => p.implantacao.orcamento.cliente_nome),
    ["ZERO A", "AL ASSESSORIA", "ZERO B"]
  );
  assert.ok(!abertos.some((p) => p.implantacao.orcamento.cliente_nome === "NAVARRO ENGENHARIA"));
});

run("Concluído mostra somente processos finalizados", () => {
  const concluidos = filterRiscosPsicossociaisProcessosPorStatus(
    todos,
    "concluido"
  );
  assert.deepEqual(
    concluidos.map((p) => p.implantacao.orcamento.cliente_nome),
    ["NAVARRO ENGENHARIA"]
  );
});

run("conclusão usa status/etapas reais, não texto de badge", () => {
  assert.equal(isRiscosProcessoListagemConcluido(navarro), true);
  assert.equal(isRiscosProcessoListagemConcluido(alAssessoria), false);
  assert.equal(
    isRiscosProcessoListagemConcluido(
      processo({
        cliente: "POR ETAPAS",
        status: "em_andamento",
        etapaAtual: "finalizado",
        etapasConcluidas: 6,
        totalEtapas: 6,
        progressoPercentual: 100,
        dataEntrada: "2026-08-01T12:00:00Z",
      })
    ),
    true
  );
});

run("Aberto: maior percentual primeiro; 60% antes de 0%", () => {
  const abertos = filterRiscosPsicossociaisProcessosPorStatus(todos, "aberto");
  const ordenados = sortRiscosPsicossociaisProcessosListagem(abertos, "aberto");
  assert.deepEqual(
    ordenados.map((p) => p.implantacao.orcamento.cliente_nome),
    ["AL ASSESSORIA", "ZERO A", "ZERO B"]
  );
  assert.ok(ordenados[0].progressoPercentual > ordenados[1].progressoPercentual);
});

run("Aberto: empate de percentual → data de entrada mais antiga primeiro", () => {
  const empresaA = processo({
    cliente: "Empresa A",
    etapasConcluidas: 3,
    totalEtapas: 5,
    progressoPercentual: 60,
    dataEntrada: "2026-08-10T12:00:00Z",
  });
  const empresaB = processo({
    cliente: "Empresa B",
    etapasConcluidas: 3,
    totalEtapas: 5,
    progressoPercentual: 60,
    dataEntrada: "2026-08-17T12:00:00Z",
  });
  const ordenados = sortRiscosPsicossociaisProcessosListagem(
    [empresaB, empresaA],
    "aberto"
  );
  assert.deepEqual(
    ordenados.map((p) => p.implantacao.orcamento.cliente_nome),
    ["Empresa A", "Empresa B"]
  );
});

run("Aberto: ordena por percentual, não pela quantidade absoluta de etapas", () => {
  const tresDeCinco = processo({
    cliente: "3 de 5",
    etapasConcluidas: 3,
    totalEtapas: 5,
    progressoPercentual: 60,
    dataEntrada: "2026-08-20T12:00:00Z",
  });
  const tresDeSeis = processo({
    cliente: "3 de 6",
    etapasConcluidas: 3,
    totalEtapas: 6,
    progressoPercentual: 50,
    dataEntrada: "2026-08-01T12:00:00Z",
  });
  const ordenados = sortRiscosPsicossociaisProcessosListagem(
    [tresDeSeis, tresDeCinco],
    "aberto"
  );
  assert.deepEqual(
    ordenados.map((p) => p.implantacao.orcamento.cliente_nome),
    ["3 de 5", "3 de 6"]
  );
});

run("Concluído: concluidoEm mais recente primeiro; fallback dataEntrada", () => {
  const recente = processo({
    cliente: "Recente",
    status: "concluido",
    etapaAtual: "finalizado",
    etapasConcluidas: 5,
    totalEtapas: 5,
    progressoPercentual: 100,
    dataEntrada: "2026-07-01T12:00:00Z",
    concluidoEm: "2026-08-20T12:00:00Z",
  });
  const antigo = processo({
    cliente: "Antigo",
    status: "concluido",
    etapaAtual: "finalizado",
    etapasConcluidas: 5,
    totalEtapas: 5,
    progressoPercentual: 100,
    dataEntrada: "2026-08-01T12:00:00Z",
    concluidoEm: "2026-08-10T12:00:00Z",
  });
  const semConclusao = processo({
    cliente: "Sem data conclusão",
    status: "concluido",
    etapaAtual: "finalizado",
    etapasConcluidas: 5,
    totalEtapas: 5,
    progressoPercentual: 100,
    dataEntrada: "2026-08-18T12:00:00Z",
    concluidoEm: null,
  });
  const ordenados = sortRiscosPsicossociaisProcessosListagem(
    [antigo, semConclusao, recente],
    "concluido"
  );
  assert.deepEqual(
    ordenados.map((p) => p.implantacao.orcamento.cliente_nome),
    ["Recente", "Sem data conclusão", "Antigo"]
  );
});

run("Status combina com filtro de mês", () => {
  const julhoAberto = processo({
    cliente: "Julho Aberto",
    etapasConcluidas: 2,
    totalEtapas: 5,
    progressoPercentual: 40,
    dataEntrada: "2026-07-15T12:00:00Z",
  });
  const agosto = { year: 2026, month: 8 };
  const porMes = filterRiscosPsicossociaisProcessosPorMes(
    [...todos, julhoAberto],
    agosto
  );
  const abertos = filterRiscosPsicossociaisProcessosPorStatus(porMes, "aberto");
  const concluidos = filterRiscosPsicossociaisProcessosPorStatus(
    porMes,
    "concluido"
  );
  assert.ok(!abertos.some((p) => p.implantacao.orcamento.cliente_nome === "Julho Aberto"));
  assert.ok(!abertos.some((p) => p.implantacao.orcamento.cliente_nome === "NAVARRO ENGENHARIA"));
  assert.equal(concluidos.length, 1);
  assert.equal(
    concluidos[0].implantacao.orcamento.cliente_nome,
    "NAVARRO ENGENHARIA"
  );
});

run("UI: STATUS ao lado do ano, padrão Aberto, sem persistir no refresh", () => {
  const hook = readFileSync(
    join(root, "hooks/useRiscosPsicossociaisPage.ts"),
    "utf8"
  );
  const table = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosPsicossociaisTable.tsx"),
    "utf8"
  );
  const page = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosPsicossociaisPage.tsx"),
    "utf8"
  );

  assert.match(hook, /DEFAULT_RISCOS_LISTAGEM_STATUS/);
  assert.match(hook, /useState<RiscosPsicossociaisListagemStatus>\(DEFAULT_RISCOS_LISTAGEM_STATUS\)/);
  assert.doesNotMatch(hook, /sessionStorage.*statusListagem/);
  assert.match(table, /htmlFor="riscos-listagem-status"/);
  assert.match(table, />Aberto</);
  assert.match(table, />Concluído</);
  assert.match(table, /yearRowExtra/);
  assert.match(page, /statusListagem=\{statusListagem\}/);
});

console.log("\nTodos os testes de listagem STATUS passaram.");
