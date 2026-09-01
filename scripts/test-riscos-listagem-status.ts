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
  RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE,
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS,
  RISCOS_PSICOSSOCIAIS_ETAPAS,
  RISCOS_ETAPA_BADGE_BASE,
  filterRiscosPsicossociaisProcessosPorMes,
  filterRiscosPsicossociaisProcessosPorStatus,
  indiceEtapaAtualRiscos,
  isRiscosListagemStatusMarcado,
  isRiscosProcessoListagemCancelado,
  isRiscosProcessoListagemConcluido,
  isRiscosProcessoListagemRelatorioGerado,
  labelEtapaAtualProcessoRiscos,
  labelRiscosListagemStatusFiltro,
  RISCOS_PSICOSSOCIAIS_LISTAGEM_STATUS_OPTIONS,
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

const legrandLikeCancelado = processo({
  cliente: "LEGRAND LIKE",
  status: "cancelado",
  etapaAtual: "cancelado",
  etapasConcluidas: 0,
  totalEtapas: 6,
  progressoPercentual: 0,
  dataEntrada: "2026-07-01T12:00:00Z",
});

const todos = [zeroA, navarro, alAssessoria, zeroB, legrandLikeCancelado];

run("padrão da listagem: Aberto + Relatório gerado + Concluído", () => {
  assert.deepEqual(DEFAULT_RISCOS_LISTAGEM_STATUS, [
    "aberto",
    "relatorio_gerado",
    "concluido",
  ]);
  assert.equal(
    labelRiscosListagemStatusFiltro(DEFAULT_RISCOS_LISTAGEM_STATUS),
    "Aberto, Relatório gerado, Concluído"
  );
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
      "relatorio_gerado",
      "finalizado",
    ]
  );
  assert.deepEqual(RISCOS_PSICOSSOCIAIS_ETAPA_ATUAL_ORDEM, [
    "laudos_sst",
    "solicitar_lista_presenca",
    "lista_presenca_solicitada",
    "abrir_pesquisa",
    "aguardando_respostas",
    "gerar_relatorio",
    "relatorio_gerado",
    "finalizado",
  ]);
  assert.equal(indiceEtapaAtualRiscos("laudos_sst"), 0);
  assert.equal(indiceEtapaAtualRiscos("solicitar_lista_presenca"), 1);
  assert.equal(indiceEtapaAtualRiscos("lista_presenca"), 1);
  assert.equal(indiceEtapaAtualRiscos("lista_presenca_solicitada"), 2);
  assert.equal(indiceEtapaAtualRiscos("abrir_pesquisa"), 3);
  assert.equal(indiceEtapaAtualRiscos("cadastro_colaboradores"), 3);
  assert.equal(indiceEtapaAtualRiscos("link_enviado"), 3);
  assert.equal(indiceEtapaAtualRiscos("aguardando_respostas"), 4);
  assert.equal(indiceEtapaAtualRiscos("gerar_relatorio"), 5);
  assert.equal(indiceEtapaAtualRiscos("relatorio_gerado"), 6);
  assert.equal(indiceEtapaAtualRiscos("finalizado"), 7);
});

run("Aberto exclui Finalizado/100% e inclui 0–N etapas", () => {
  const abertos = filterRiscosPsicossociaisProcessosPorStatus(todos, [
    "aberto",
  ]);
  assert.deepEqual(
    abertos.map((p) => p.implantacao.orcamento.cliente_nome),
    ["ZERO A", "AL ASSESSORIA", "ZERO B"]
  );
  assert.ok(!abertos.some((p) => p.implantacao.orcamento.cliente_nome === "NAVARRO ENGENHARIA"));
  assert.ok(!abertos.some((p) => p.implantacao.orcamento.cliente_nome === "LEGRAND LIKE"));
});

run("Concluído mostra somente processos finalizados", () => {
  const concluidos = filterRiscosPsicossociaisProcessosPorStatus(
    todos,
    ["concluido"]
  );
  assert.deepEqual(
    concluidos.map((p) => p.implantacao.orcamento.cliente_nome),
    ["NAVARRO ENGENHARIA"]
  );
});

run("Cancelado mostra somente processos cancelados", () => {
  const cancelados = filterRiscosPsicossociaisProcessosPorStatus(
    todos,
    ["cancelado"]
  );
  assert.deepEqual(
    cancelados.map((p) => p.implantacao.orcamento.cliente_nome),
    ["LEGRAND LIKE"]
  );
  assert.equal(isRiscosProcessoListagemCancelado(legrandLikeCancelado), true);
  assert.equal(isRiscosProcessoListagemConcluido(legrandLikeCancelado), false);
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
  const abertos = filterRiscosPsicossociaisProcessosPorStatus(todos, ["aberto"]);
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

run("Aberto: Lista de Presença acima de Aguardando Laudos SST com 0%", () => {
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
  const abrir = processo({
    cliente: "Abrir",
    origem: "manual_cliente",
    etapaAtual: "abrir_pesquisa",
    etapasConcluidas: 0,
    totalEtapas: 5,
    progressoPercentual: 0,
    dataEntrada: "2026-08-03T12:00:00Z",
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
    [laudo, lista, abrir, aguardando],
    "aberto"
  );
  assert.deepEqual(
    ordenados.map((p) => p.etapaAtual),
    [
      "aguardando_respostas",
      "abrir_pesquisa",
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
  const abertos = filterRiscosPsicossociaisProcessosPorStatus(porMes, ["aberto"]);
  const concluidos = filterRiscosPsicossociaisProcessosPorStatus(
    porMes,
    ["concluido"]
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
  assert.match(hook, /useState<\s*RiscosPsicossociaisListagemStatus\[\]/);
  assert.doesNotMatch(hook, /sessionStorage.*statusListagem/);
  assert.match(table, /htmlFor="riscos-listagem-status"|id="riscos-listagem-status"/);
  assert.match(table, /CheckboxMultiSelect/);
  assert.match(table, /RISCOS_PSICOSSOCIAIS_LISTAGEM_STATUS_OPTIONS/);
  assert.match(table, /onToggleStatusListagem/);
  assert.match(table, /yearRowExtra/);
  assert.match(table, /RiscosEtapaAtualBadge/);
  assert.match(page, /statusListagem=\{statusListagem\}/);
});

run("labels da etapa atual: Abrir pesquisa e Aguardando Laudos SST", () => {
  assert.equal(RISCOS_PSICOSSOCIAIS_ETAPA_LABELS.abrir_pesquisa, "Abrir pesquisa");
  assert.equal(RISCOS_PSICOSSOCIAIS_ETAPAS[0].label, "Aguardando Laudos SST");
  assert.equal(
    labelEtapaAtualProcessoRiscos({
      status: "em_andamento",
      etapaAtual: "abrir_pesquisa",
    }),
    "Abrir pesquisa"
  );
  assert.equal(
    labelEtapaAtualProcessoRiscos({
      status: "em_andamento",
      etapaAtual: "aguardando_respostas",
    }),
    "Aguardando respostas"
  );
  assert.equal(
    labelEtapaAtualProcessoRiscos({
      status: "em_andamento",
      etapaAtual: "laudos_sst",
    }),
    "Aguardando Laudos SST"
  );
  assert.equal(
    labelEtapaAtualProcessoRiscos({
      status: "em_andamento",
      etapaAtual: "gerar_relatorio",
    }),
    "Gerar Relatório"
  );
  const lib = readFileSync(join(root, "lib/riscos-psicossociais.ts"), "utf8");
  const painel = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosPsicossociaisPainel.tsx"),
    "utf8"
  );
  assert.doesNotMatch(lib, /Laudo SST Automático/);
  assert.match(painel, /Etapa atual:/);
  assert.match(painel, /RiscosEtapaAtualBadge/);
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

run("badges: cada etapa operacional tem tom próprio", () => {
  const badge = (
    etapa: Parameters<typeof riscosPsicossociaisEtapaAtualBadgeClass>[0],
    status: Parameters<typeof riscosPsicossociaisEtapaAtualBadgeClass>[1]
  ) => riscosPsicossociaisEtapaAtualBadgeClass(etapa, status);

  const cinza = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.laudos_sst}`;
  const laranja = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.solicitar_lista_presenca}`;
  const amarelo = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.lista_presenca_solicitada}`;
  const azulClaro = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.lista_presenca}`;
  const roxo = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.abrir_pesquisa}`;
  const azul = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.aguardando_respostas}`;
  const ambar = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.gerar_relatorio}`;
  const verde = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.finalizado}`;
  const vermelho = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.cancelado}`;

  assert.equal(badge("laudos_sst", "em_andamento"), cinza);
  assert.equal(badge("solicitar_lista_presenca", "em_andamento"), laranja);
  assert.equal(badge("lista_presenca_solicitada", "em_andamento"), amarelo);
  assert.equal(badge("lista_presenca", "em_andamento"), azulClaro);
  assert.equal(badge("abrir_pesquisa", "em_andamento"), roxo);
  assert.equal(badge("cadastro_colaboradores", "em_andamento"), roxo);
  assert.equal(badge("link_enviado", "em_andamento"), roxo);
  assert.equal(badge("aguardando_respostas", "em_andamento"), azul);
  assert.equal(badge("gerar_relatorio", "em_andamento"), ambar);
  const violeta = `${RISCOS_ETAPA_BADGE_BASE} ${RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.relatorio_gerado}`;
  assert.equal(badge("relatorio_gerado", "em_andamento"), violeta);
  assert.equal(badge("finalizado", "concluido"), verde);
  assert.equal(badge("cancelado", "cancelado"), vermelho);

  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.laudos_sst,
    "bg-[#f1f5f9] text-[#475569]"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.solicitar_lista_presenca,
    "bg-[#ffedd5] text-[#c2410c]"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.lista_presenca_solicitada,
    "bg-[#fef9c3] text-[#a16207]"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.lista_presenca,
    "bg-[#E8EEFF] text-[#3F51D7]"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.abrir_pesquisa,
    "bg-[#f3e8ff] text-[#7e22ce]"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.aguardando_respostas,
    "bg-[#eff6ff] text-[#1d4ed8]"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.gerar_relatorio,
    "bg-[#fef3c7] text-[#b45309]"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.finalizado,
    "bg-brand-green-soft text-brand-green"
  );
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE.cancelado,
    "bg-[#fef2f2] text-brand-red"
  );
  assert.match(ambar, /#fef3c7/);
  assert.match(ambar, /#b45309/);
  assert.match(azul, /#eff6ff/);
  assert.match(azul, /#1d4ed8/);
  assert.notEqual(laranja, ambar, "Solicitar lista e Gerar Relatório não compartilham o mesmo tom");

  const etapas: Array<keyof typeof RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE> = [
    "laudos_sst",
    "solicitar_lista_presenca",
    "lista_presenca_solicitada",
    "lista_presenca",
    "abrir_pesquisa",
    "cadastro_colaboradores",
    "link_enviado",
    "aguardando_respostas",
    "gerar_relatorio",
    "relatorio_gerado",
    "finalizado",
    "cancelado",
  ];
  for (const etapa of etapas) {
    const cls = badge(etapa, etapa === "cancelado" ? "cancelado" : etapa === "finalizado" ? "concluido" : "em_andamento");
    assert.ok(
      cls.startsWith(RISCOS_ETAPA_BADGE_BASE),
      `badge sem classe base em ${etapa}`
    );
    assert.ok(
      RISCOS_PSICOSSOCIAIS_ETAPA_BADGE_TONE[etapa],
      `tom ausente para ${etapa}`
    );
  }

  const badgeComponent = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosEtapaAtualBadge.tsx"),
    "utf8"
  );
  assert.match(badgeComponent, /riscosPsicossociaisEtapaAtualBadgeClass/);
});

run("Gerar Relatório (5/7) fica em Aberto; Relatório gerado em categoria própria", () => {
  const gerar = processo({
    cliente: "ACS",
    status: "em_andamento",
    etapaAtual: "gerar_relatorio",
    etapasConcluidas: 5,
    totalEtapas: 7,
    progressoPercentual: 71,
    dataEntrada: "2026-08-01T12:00:00Z",
  });
  assert.equal(isRiscosProcessoListagemConcluido(gerar), false);
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([gerar], ["aberto"]).length,
    1
  );
  const relatorioGerado = processo({
    cliente: "ACS RG",
    status: "em_andamento",
    etapaAtual: "relatorio_gerado",
    etapasConcluidas: 6,
    totalEtapas: 7,
    progressoPercentual: 86,
    relatorioGerado: true,
    dataEntrada: "2026-08-01T12:00:00Z",
  } as never);
  assert.equal(isRiscosProcessoListagemRelatorioGerado(relatorioGerado), true);
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([relatorioGerado], [
      "relatorio_gerado",
    ]).length,
    1
  );
  const finalizado = processo({
    cliente: "ACS OK",
    status: "concluido",
    etapaAtual: "finalizado",
    etapasConcluidas: 7,
    totalEtapas: 7,
    progressoPercentual: 100,
    dataEntrada: "2026-08-01T12:00:00Z",
  });
  assert.equal(isRiscosProcessoListagemConcluido(finalizado), true);
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([finalizado], ["concluido"])
      .length,
    1
  );
});

console.log("\nTodos os testes de listagem STATUS passaram.");
