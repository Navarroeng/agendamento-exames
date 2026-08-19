/**
 * Filtro STATUS (Aberto / Concluído) e ordenação da listagem de Riscos.
 * Executar: npx tsx scripts/test-riscos-listagem-status.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_RISCOS_LISTAGEM_STATUS,
  RISCOS_PSICOSSOCIAIS_ETAPA_ATUAL_ORDEM,
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  filterRiscosPsicossociaisProcessosPorMes,
  filterRiscosPsicossociaisProcessosPorStatus,
  indiceEtapaAtualRiscos,
  isRiscosProcessoListagemConcluido,
  riscosPsicossociaisEtapaAtualBadgeClass,
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
    origem?: RiscosPsicossociaisProcesso["origem"];
    status?: RiscosPsicossociaisProcesso["status"];
    etapaAtual?: RiscosPsicossociaisProcesso["etapaAtual"];
    etapasConcluidas: number;
    totalEtapas: number;
    progressoPercentual: number;
    dataEntrada: string | null;
    concluidoEm?: string | null;
  }
): RiscosPsicossociaisProcesso {
  const origem = overrides.origem ?? "orcamento";
  return {
    processoKey: overrides.cliente,
    origem,
    exigeLaudosSst: origem !== "manual_cliente",
    implantacao: {
      orcamento: {
        cliente_nome: overrides.cliente,
        numero: overrides.cliente,
      },
    },
    etapaAtual: overrides.etapaAtual ?? "solicitar_lista_presenca",
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

run("índice da etapa reutiliza a sequência oficial da UI", () => {
  assert.deepEqual(
    RISCOS_PSICOSSOCIAIS_ETAPAS.map((e) => e.id),
    [
      "laudos_sst",
      "lista_presenca",
      "cadastro_colaboradores",
      "link_enviado",
      "aguardando_respostas",
      "finalizado",
    ]
  );
  assert.deepEqual(RISCOS_PSICOSSOCIAIS_ETAPA_ATUAL_ORDEM, [
    "laudos_sst",
    "solicitar_lista_presenca",
    "lista_presenca_solicitada",
    "cadastro_colaboradores",
    "link_enviado",
    "aguardando_respostas",
    "finalizado",
  ]);
  assert.equal(indiceEtapaAtualRiscos("laudos_sst"), 0);
  assert.equal(indiceEtapaAtualRiscos("solicitar_lista_presenca"), 1);
  assert.equal(indiceEtapaAtualRiscos("lista_presenca"), 1);
  assert.equal(indiceEtapaAtualRiscos("lista_presenca_solicitada"), 2);
  assert.equal(indiceEtapaAtualRiscos("aguardando_respostas"), 5);
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
    etapaAtual: "aguardando_respostas",
    etapasConcluidas: 3,
    totalEtapas: 5,
    progressoPercentual: 60,
    dataEntrada: "2026-08-10T12:00:00Z",
  });
  const empresaB = processo({
    cliente: "Empresa B",
    etapaAtual: "aguardando_respostas",
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

run("Aberto: Lista de Presença acima de Laudo SST Automático com 0%", () => {
  const laudo = processo({
    cliente: "Empresa B",
    origem: "orcamento",
    etapaAtual: "laudos_sst",
    etapasConcluidas: 0,
    totalEtapas: 6,
    progressoPercentual: 0,
    dataEntrada: "2026-08-01T12:00:00Z",
  });
  const lista = processo({
    cliente: "Empresa A",
    origem: "manual_cliente",
    etapaAtual: "solicitar_lista_presenca",
    etapasConcluidas: 0,
    totalEtapas: 5,
    progressoPercentual: 0,
    dataEntrada: "2026-08-17T12:00:00Z",
  });
  const ordenados = sortRiscosPsicossociaisProcessosListagem(
    [laudo, lista],
    "aberto"
  );
  assert.deepEqual(
    ordenados.map((p) => [p.implantacao.orcamento.cliente_nome, p.etapaAtual]),
    [
      ["Empresa A", "solicitar_lista_presenca"],
      ["Empresa B", "laudos_sst"],
    ]
  );
});

run("Aberto: etapa mais avançada acima, na sequência real da UI", () => {
  const laudo = processo({
    cliente: "Laudo",
    origem: "orcamento",
    etapaAtual: "laudos_sst",
    etapasConcluidas: 0,
    totalEtapas: 6,
    progressoPercentual: 0,
    dataEntrada: "2026-08-01T12:00:00Z",
  });
  const lista = processo({
    cliente: "Lista",
    origem: "manual_cliente",
    etapaAtual: "solicitar_lista_presenca",
    etapasConcluidas: 0,
    totalEtapas: 5,
    progressoPercentual: 0,
    dataEntrada: "2026-08-02T12:00:00Z",
  });
  const cadastro = processo({
    cliente: "Cadastro",
    origem: "manual_cliente",
    etapaAtual: "cadastro_colaboradores",
    etapasConcluidas: 0,
    totalEtapas: 5,
    progressoPercentual: 0,
    dataEntrada: "2026-08-03T12:00:00Z",
  });
  const link = processo({
    cliente: "Link",
    origem: "orcamento",
    etapaAtual: "link_enviado",
    etapasConcluidas: 0,
    totalEtapas: 6,
    progressoPercentual: 0,
    dataEntrada: "2026-08-04T12:00:00Z",
  });
  const aguardando = processo({
    cliente: "Aguardando",
    origem: "orcamento",
    etapaAtual: "aguardando_respostas",
    etapasConcluidas: 0,
    totalEtapas: 6,
    progressoPercentual: 0,
    dataEntrada: "2026-08-05T12:00:00Z",
  });
  const ordenados = sortRiscosPsicossociaisProcessosListagem(
    [laudo, lista, cadastro, link, aguardando],
    "aberto"
  );
  assert.deepEqual(
    ordenados.map((p) => p.etapaAtual),
    [
      "aguardando_respostas",
      "link_enviado",
      "cadastro_colaboradores",
      "solicitar_lista_presenca",
      "laudos_sst",
    ]
  );
});

run("Aberto: 60% continua acima de 0% mesmo com etapa menos avançada", () => {
  const sessenta = processo({
    cliente: "60%",
    origem: "orcamento",
    etapaAtual: "laudos_sst",
    etapasConcluidas: 3,
    totalEtapas: 5,
    progressoPercentual: 60,
    dataEntrada: "2026-08-20T12:00:00Z",
  });
  const zeroLista = processo({
    cliente: "0% lista",
    origem: "manual_cliente",
    etapaAtual: "solicitar_lista_presenca",
    etapasConcluidas: 0,
    totalEtapas: 5,
    progressoPercentual: 0,
    dataEntrada: "2026-08-01T12:00:00Z",
  });
  const ordenados = sortRiscosPsicossociaisProcessosListagem(
    [zeroLista, sessenta],
    "aberto"
  );
  assert.equal(ordenados[0].implantacao.orcamento.cliente_nome, "60%");
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
  assert.match(table, /riscosPsicossociaisEtapaAtualBadgeClass/);
  assert.match(page, /statusListagem=\{statusListagem\}/);
});

run("Aberto: lista solicitada acima de solicitar, no mesmo percentual", () => {
  const solicitar = processo({
    cliente: "Ainda solicitar",
    origem: "manual_cliente",
    etapaAtual: "solicitar_lista_presenca",
    etapasConcluidas: 0,
    totalEtapas: 5,
    progressoPercentual: 0,
    dataEntrada: "2026-08-01T12:00:00Z",
  });
  const solicitada = processo({
    cliente: "Já solicitada",
    origem: "manual_cliente",
    etapaAtual: "lista_presenca_solicitada",
    etapasConcluidas: 0,
    totalEtapas: 5,
    progressoPercentual: 0,
    dataEntrada: "2026-08-10T12:00:00Z",
  });
  const ordenados = sortRiscosPsicossociaisProcessosListagem(
    [solicitar, solicitada],
    "aberto"
  );
  assert.deepEqual(
    ordenados.map((p) => p.etapaAtual),
    ["lista_presenca_solicitada", "solicitar_lista_presenca"]
  );
});

run("badges: solicitar azul claro, solicitada lilás, demais intactos", () => {
  const azul =
    "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#E8EEFF] text-[#3F51D7]";
  const lilas =
    "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#F1EDFF] text-[#6D4AFF]";
  const amarelo =
    "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#fef3c7] text-[#b45309]";
  const indigo =
    "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#eef2ff] text-[#4338ca]";
  const verde =
    "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-brand-green-soft text-brand-green";
  assert.equal(
    riscosPsicossociaisEtapaAtualBadgeClass(
      "solicitar_lista_presenca",
      "em_andamento"
    ),
    azul
  );
  assert.equal(
    riscosPsicossociaisEtapaAtualBadgeClass(
      "lista_presenca_solicitada",
      "em_andamento"
    ),
    lilas
  );
  assert.equal(
    riscosPsicossociaisEtapaAtualBadgeClass("laudos_sst", "em_andamento"),
    amarelo
  );
  assert.equal(
    riscosPsicossociaisEtapaAtualBadgeClass(
      "cadastro_colaboradores",
      "em_andamento"
    ),
    indigo
  );
  assert.equal(
    riscosPsicossociaisEtapaAtualBadgeClass("finalizado", "concluido"),
    verde
  );
});

console.log("\nTodos os testes de listagem STATUS passaram.");
