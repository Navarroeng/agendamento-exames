/**
 * Suíte: cancelamento lógico do processo de Riscos Psicossociais.
 * Sem banco. Não usa dados reais da LEGRAND.
 *
 * Executar: npx tsx scripts/test-riscos-processo-cancelado.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLaudosSstProcesso } from "../lib/laudos-sst";
import type { ImplantacaoProcesso } from "../lib/implantacao-clientes";
import {
  acoesMenuListagemProcessoRiscos,
  type RiscosCampanhaRecord,
} from "../lib/riscos-campanha";
import { RISCOS_CAMPANHA_ORIGEM } from "../lib/riscos-campanha-origem";
import { MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO } from "../lib/riscos-invalidacao";
import {
  MSG_PROCESSO_RISCOS_CANCELADO,
  MSG_PROCESSO_RISCOS_JA_CANCELADO,
  MSG_PROCESSO_RISCOS_JA_CONCLUIDO,
  deveCancelarCampanhaVinculada,
  deveInserirTrackingRiscosNoSincronismo,
  identidadeCancelamentoProcessoRiscos,
  isProcessoRiscosCancelado,
  processoRiscosPermiteAvancar,
  validateCancelarProcessoListagem,
} from "../lib/riscos-processo-cancelamento";
import {
  buildRiscosProcessoManualCliente,
  buildRiscosPsicossociaisProcesso,
  filterRiscosPsicossociaisProcessosPorStatus,
  isProcessoElegivelRiscosPsicossociais,
  isProcessoVisivelRiscosAutomatico,
  isRiscosEtapaLiberadaByFluxo,
  RISCOS_PSICOSSOCIAIS_ETAPA_LABELS,
  riscosPsicossociaisEtapaAtualBadgeClass,
  type OrcamentoRiscosPsicossociaisRecord,
} from "../lib/riscos-psicossociais";
import { validatePodeGerarRelatorioFinal } from "../lib/riscos-relatorio";

const root = join(__dirname, "..");

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function implantacao(partial: {
  id: string;
  cliente: string;
  possuiPacoteCompletoSst: boolean;
}): ImplantacaoProcesso {
  return {
    orcamento: {
      id: partial.id,
      numero: `ORC-${partial.id}`,
      cliente_nome: partial.cliente,
      cliente_cnpj: "12.345.678/0001-90",
      responsavel: "AGATHA",
      status: "aprovado",
    },
    etapaAtual: "concluido",
    dataAprovacao: "2026-06-01T12:00:00Z",
    numeroContrato: "CT-1",
    possuiPacoteCompletoSst: partial.possuiPacoteCompletoSst,
  } as ImplantacaoProcesso;
}

function tracking(
  orcamentoId: string,
  patch: Partial<OrcamentoRiscosPsicossociaisRecord> = {}
): OrcamentoRiscosPsicossociaisRecord {
  return {
    orcamento_id: orcamentoId,
    etapa_atual: "lista_presenca",
    etapas_concluidas: 0,
    status: "em_andamento",
    entrada_em: "2026-07-01T12:00:00Z",
    lista_solicitada: false,
    lista_recebida: false,
    ...patch,
  };
}

function campanha(
  partial: Partial<RiscosCampanhaRecord> &
    Pick<RiscosCampanhaRecord, "id" | "status">
): RiscosCampanhaRecord {
  return {
    orcamento_id: "orc-camp",
    cliente_id: "cli-1",
    cnpj: "12345678000199",
    empresa_nome: "Empresa Teste",
    data_inicio: "2026-08-01",
    data_encerramento: "2026-08-31",
    quantidade_prevista: 10,
    codigo_publico: "TST123",
    codigo_acesso_exibicao: "XXXX",
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    responsavel: "AGATHA",
    observacoes: null,
    criado_por: "AGATHA",
    logo_url: null,
    logo_storage_path: null,
    logo_origem: null,
    logo_nome: null,
    logo_tipo: null,
    logo_tamanho: null,
    created_at: "2026-08-01T12:00:00.000Z",
    ...partial,
  };
}

const MOTIVO_LEGRAND_LIKE =
  "Processo criado para teste antes da regra atual de elegibilidade";

run("1. processo sem campanha pode cancelar (identidade = orcamento_id)", () => {
  const ids = identidadeCancelamentoProcessoRiscos({
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    processoKey: "orc-sem-campanha",
    orcamentoId: "orc-sem-campanha",
    campanhaId: null,
  });
  assert.equal(ids.orcamentoId, "orc-sem-campanha");
  assert.equal(ids.campanhaId, undefined);
  assert.equal(
    validateCancelarProcessoListagem({
      status: "em_andamento",
      motivo: MOTIVO_LEGRAND_LIKE,
    }),
    null
  );

  const api = readFileSync(
    join(root, "app/api/riscos/processo/cancelar/route.ts"),
    "utf8"
  );
  assert.match(api, /orcamentoId/);
  assert.match(api, /cancelarProcessoListagemRiscosNoServidor/);

  const hook = readFileSync(
    join(root, "hooks/useRiscosPsicossociaisPage.ts"),
    "utf8"
  );
  assert.match(hook, /identidadeCancelamentoProcessoRiscos/);
  assert.match(hook, /cancelarProcessoListagemRiscos/);
  assert.doesNotMatch(hook, /if\s*\(\s*!alvo\.campanha\?\.id/);
  assert.doesNotMatch(hook, /result\.campanha\.status === ["']cancelada["']/);
});

run("2. campanha em preparação deve ser cancelada", () => {
  assert.equal(deveCancelarCampanhaVinculada("em_preparacao"), true);
  const server = readFileSync(
    join(root, "services/riscos-campanha-cancelar.server.ts"),
    "utf8"
  );
  assert.match(server, /deveCancelarCampanhaVinculada/);
  assert.match(server, /status: "cancelada"/);
});

run("3. campanha aberta é cancelada e sessões invalidadas", () => {
  assert.equal(deveCancelarCampanhaVinculada("aberta"), true);
  const server = readFileSync(
    join(root, "services/riscos-campanha-cancelar.server.ts"),
    "utf8"
  );
  assert.match(server, /invalidarSessoesDaCampanha/);
  assert.match(server, /MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO/);
  assert.ok(MOTIVO_INVALIDACAO_CANCELAMENTO_PROCESSO.length > 10);
});

run("4. campanha encerrada permanece encerrada", () => {
  assert.equal(deveCancelarCampanhaVinculada("encerrada"), false);
  assert.equal(deveCancelarCampanhaVinculada("cancelada"), false);

  const imp = implantacao({
    id: "orc-encerrada",
    cliente: "Cliente Encerrada",
    possuiPacoteCompletoSst: true,
  });
  const laudos = buildLaudosSstProcesso(imp, {
    orcamento_id: "orc-encerrada",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
    entrada_em: "2026-07-01T12:00:00Z",
  });
  const processo = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-encerrada", {
      status: "cancelado",
      cancelado_em: "2026-08-20T13:00:00Z",
      cancelado_por: "AGATHA",
      motivo_cancelamento: "Cliente desistiu após encerrar a pesquisa",
    }),
    campanha({
      id: "camp-encerrada",
      status: "encerrada",
      orcamento_id: "orc-encerrada",
    })
  );
  assert.equal(processo.status, "cancelado");
  assert.equal(processo.campanha?.status, "encerrada");
});

run("5–6. tracking recebe cancelado e preserva motivo/data/usuário", () => {
  const imp = implantacao({
    id: "orc-meta",
    cliente: "Meta",
    possuiPacoteCompletoSst: true,
  });
  const laudos = buildLaudosSstProcesso(imp, null);
  const processo = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-meta", {
      status: "cancelado",
      cancelado_em: "2026-08-20T14:00:00.000Z",
      cancelado_por: "AGATHA NAVARRO",
      motivo_cancelamento: "Cliente não deseja realizar a avaliação",
    }),
    null
  );
  assert.equal(processo.status, "cancelado");
  assert.equal(processo.etapaAtual, "cancelado");
  assert.equal(processo.canceladoPor, "AGATHA NAVARRO");
  assert.equal(processo.canceladoEm, "2026-08-20T14:00:00.000Z");
  assert.equal(
    processo.motivoCancelamento,
    "Cliente não deseja realizar a avaliação"
  );
  assert.equal(processo.campanha, null);
});

run("7–8. cancelado sai de Aberto e entra no filtro Cancelado", () => {
  const imp = implantacao({
    id: "orc-filtro",
    cliente: "Filtro",
    possuiPacoteCompletoSst: true,
  });
  const laudos = buildLaudosSstProcesso(imp, null);
  const aberto = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-filtro"),
    null
  );
  const cancelado = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-filtro", { status: "cancelado" }),
    null
  );
  const concluido = {
    ...aberto,
    status: "concluido" as const,
    etapaAtual: "finalizado" as const,
    etapasConcluidas: 6,
    totalEtapas: 6,
    progressoPercentual: 100,
  };

  const todos = [aberto, cancelado, concluido];
  const abertos = filterRiscosPsicossociaisProcessosPorStatus(todos, "aberto");
  const cancelados = filterRiscosPsicossociaisProcessosPorStatus(
    todos,
    "cancelado"
  );
  const concluidos = filterRiscosPsicossociaisProcessosPorStatus(
    todos,
    "concluido"
  );

  assert.ok(abertos.every((p) => p.status !== "cancelado"));
  assert.ok(abertos.every((p) => p.status !== "concluido"));
  assert.equal(cancelados.length, 1);
  assert.equal(cancelados[0].status, "cancelado");
  assert.ok(!abertos.some((p) => p.status === "cancelado"));
  assert.ok(concluidos.every((p) => p.status === "concluido"));
});

run("9. inclusão manual persiste cancelamento no fluxo da campanha", () => {
  const ids = identidadeCancelamentoProcessoRiscos({
    origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
    processoKey: "camp-manual-1",
    orcamentoId: "manual:camp-manual-1",
    campanhaId: "camp-manual-1",
  });
  assert.deepEqual(ids, { campanhaId: "camp-manual-1" });

  const campanhaManual = campanha({
    id: "camp-manual-1",
    status: "em_preparacao",
    orcamento_id: null,
    origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
    codigo_publico: "MANUAL1",
  });
  const aberto = buildRiscosProcessoManualCliente({
    campanha: campanhaManual,
    tracking: tracking("ignored", { status: "em_andamento" }),
  });
  assert.notEqual(aberto.status, "cancelado");
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([aberto], "aberto").length,
    1
  );

  const cancelado = buildRiscosProcessoManualCliente({
    campanha: campanhaManual,
    tracking: tracking("ignored", {
      status: "cancelado",
      motivo_cancelamento: "Desistência do cliente",
      cancelado_em: "2026-08-20T15:00:00Z",
      cancelado_por: "AGATHA",
    }),
  });
  assert.equal(cancelado.status, "cancelado");
  assert.equal(cancelado.processoKey, "camp-manual-1");
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([cancelado], "aberto").length,
    0
  );
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([cancelado], "cancelado").length,
    1
  );

  const server = readFileSync(
    join(root, "services/riscos-campanha-cancelar.server.ts"),
    "utf8"
  );
  assert.match(server, /riscos_campanha_fluxo/);
  assert.match(server, /origemManual/);
});

run("10. automático funciona com orcamento_id", () => {
  const ids = identidadeCancelamentoProcessoRiscos({
    origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
    processoKey: "orc-auto",
    orcamentoId: "orc-auto",
    campanhaId: "camp-opcional",
  });
  assert.equal(ids.orcamentoId, "orc-auto");
  assert.equal(ids.campanhaId, "camp-opcional");
  assert.equal(
    isProcessoRiscosCancelado({
      origem: RISCOS_CAMPANHA_ORIGEM.orcamento,
      trackingStatus: "cancelado",
      campanhaStatus: "aberta",
    }),
    true
  );
});

run("11. elegível cancelado NÃO reaparece no sync", () => {
  const imp = implantacao({
    id: "orc-elegivel-desistiu",
    cliente: "Cliente Pacote SST",
    possuiPacoteCompletoSst: true,
  });
  assert.equal(isProcessoElegivelRiscosPsicossociais(imp), true);

  const row = tracking("orc-elegivel-desistiu", {
    status: "cancelado",
    motivo_cancelamento: "Cliente decide não realizar",
    cancelado_em: "2026-08-20T16:00:00Z",
    cancelado_por: "AGATHA",
  });
  assert.equal(deveInserirTrackingRiscosNoSincronismo(true, row), false);
  assert.equal(deveInserirTrackingRiscosNoSincronismo(true, null), true);

  const laudos = buildLaudosSstProcesso(imp, {
    orcamento_id: "orc-elegivel-desistiu",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
    entrada_em: "2026-07-01T12:00:00Z",
  });
  const processo = buildRiscosPsicossociaisProcesso(laudos, row, null);
  assert.equal(processo.status, "cancelado");
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([processo], "aberto").length,
    0
  );
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([processo], "cancelado").length,
    1
  );
});

run("12. LEGRAND-like: automático antigo, sem pacote, sem campanha", () => {
  const imp = implantacao({
    id: "orc-legrand-like",
    cliente: "Cliente legado sem pacote",
    possuiPacoteCompletoSst: false,
  });
  assert.equal(isProcessoElegivelRiscosPsicossociais(imp), false);

  const rowAntes = tracking("orc-legrand-like", {
    lista_solicitada: true,
    lista_solicitada_em: "2026-07-10",
    lista_solicitada_email: "contato@exemplo.com",
  });
  assert.equal(isProcessoVisivelRiscosAutomatico(imp, rowAntes, false), true);
  assert.equal(deveInserirTrackingRiscosNoSincronismo(false, rowAntes), false);

  const laudos = buildLaudosSstProcesso(imp, {
    orcamento_id: "orc-legrand-like",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
    entrada_em: "2026-07-01T12:00:00Z",
  });
  const antes = buildRiscosPsicossociaisProcesso(laudos, rowAntes, null);
  assert.notEqual(antes.status, "cancelado");
  assert.equal(antes.campanha, null);
  assert.equal(
    RISCOS_PSICOSSOCIAIS_ETAPA_LABELS[antes.etapaAtual],
    "Lista de presença solicitada"
  );
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([antes], "aberto").length,
    1
  );

  const ids = identidadeCancelamentoProcessoRiscos({
    origem: antes.origem,
    processoKey: antes.processoKey,
    orcamentoId: antes.implantacao.orcamento.id,
    campanhaId: null,
  });
  assert.equal(ids.orcamentoId, "orc-legrand-like");
  assert.equal(ids.campanhaId, undefined);

  const rowDepois = tracking("orc-legrand-like", {
    lista_solicitada: true,
    lista_solicitada_em: "2026-07-10",
    lista_solicitada_email: "contato@exemplo.com",
    status: "cancelado",
    motivo_cancelamento: MOTIVO_LEGRAND_LIKE,
    cancelado_em: "2026-08-20T17:00:00Z",
    cancelado_por: "AGATHA",
  });
  const depois = buildRiscosPsicossociaisProcesso(laudos, rowDepois, null);
  assert.equal(depois.status, "cancelado");
  assert.equal(depois.motivoCancelamento, MOTIVO_LEGRAND_LIKE);
  assert.equal(depois.campanha, null);
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([depois], "aberto").length,
    0
  );
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([depois], "cancelado").length,
    1
  );
  assert.equal(deveInserirTrackingRiscosNoSincronismo(false, rowDepois), false);
  assert.equal(
    deveInserirTrackingRiscosNoSincronismo(true, rowDepois),
    false,
    "mesmo que volte a ficar elegível, sync não recria"
  );
  assert.equal(isProcessoVisivelRiscosAutomatico(imp, rowDepois, false), true);
});

run("13. participantes bloqueados no backend", () => {
  const part = readFileSync(
    join(root, "services/riscos-campanha-participantes.server.ts"),
    "utf8"
  );
  assert.match(part, /assertProcessoRiscosNaoCanceladoNoServidor/);
  assert.equal(
    (part.match(/assertProcessoRiscosNaoCanceladoNoServidor/g) ?? []).length >= 4,
    true,
    "criar, atualizar, validar e importar devem checar cancelamento"
  );
  const remocao = readFileSync(
    join(root, "services/riscos-remocao-participante.service.ts"),
    "utf8"
  );
  assert.match(remocao, /assertProcessoRiscosNaoCanceladoNoServidor/);
});

run("14. relatório bloqueado no backend", () => {
  const rel = readFileSync(
    join(root, "services/riscos-relatorio.server.ts"),
    "utf8"
  );
  assert.match(rel, /assertProcessoRiscosNaoCanceladoNoServidor/);
  const msg = validatePodeGerarRelatorioFinal({
    campanhaStatus: "encerrada",
    participantesAtivos: [{ status: "respondido" }],
    jaExisteRelatorio: false,
    processoCancelado: true,
  });
  assert.match(String(msg), /cancelado/i);
});

run("15. ações de avanço bloqueadas", () => {
  assert.equal(
    processoRiscosPermiteAvancar({ status: "cancelado" }),
    false
  );
  assert.equal(
    validateCancelarProcessoListagem({
      status: "cancelado",
      motivo: MOTIVO_LEGRAND_LIKE,
    }),
    MSG_PROCESSO_RISCOS_JA_CANCELADO
  );
  assert.equal(
    validateCancelarProcessoListagem({
      status: "concluido",
      motivo: MOTIVO_LEGRAND_LIKE,
    }),
    MSG_PROCESSO_RISCOS_JA_CONCLUIDO
  );
  assert.equal(
    validateCancelarProcessoListagem({ status: "em_andamento", motivo: "   " }),
    "Informe o motivo do cancelamento."
  );

  const imp = implantacao({
    id: "orc-avanco",
    cliente: "Avanco",
    possuiPacoteCompletoSst: true,
  });
  const cancelado = buildRiscosPsicossociaisProcesso(
    buildLaudosSstProcesso(imp, null),
    tracking("orc-avanco", { status: "cancelado" }),
    null
  );
  assert.equal(isRiscosEtapaLiberadaByFluxo(cancelado, "lista_presenca"), false);
  const menu = acoesMenuListagemProcessoRiscos({
    campanhaStatus: null,
    codigoPublico: null,
    isAdmin: true,
    hasCampanha: false,
    processoCancelado: true,
  });
  assert.equal(menu.mostrarCancelar, false);
  assert.equal(menu.podeGerarRelatorio, false);

  const menuAberto = acoesMenuListagemProcessoRiscos({
    campanhaStatus: null,
    codigoPublico: null,
    isAdmin: true,
    hasCampanha: false,
    processoCancelado: false,
    processoConcluido: false,
  });
  assert.equal(menuAberto.mostrarCancelar, true);

  const encerrar = readFileSync(
    join(root, "services/riscos-campanha-status.server.ts"),
    "utf8"
  );
  assert.match(encerrar, /assertProcessoRiscosNaoCanceladoNoServidor/);
  const abrir = readFileSync(
    join(root, "services/riscos-campanha-abrir.server.ts"),
    "utf8"
  );
  assert.match(abrir, /assertProcessoRiscosNaoCanceladoNoServidor/);
  const lista = readFileSync(
    join(root, "services/riscos-lista-presenca.service.ts"),
    "utf8"
  );
  assert.match(lista, /MSG_PROCESSO_RISCOS_CANCELADO/);
  assert.equal(typeof MSG_PROCESSO_RISCOS_CANCELADO, "string");
});

run("16. processos normais não mudam", () => {
  const imp = implantacao({
    id: "orc-normal",
    cliente: "Processo normal",
    possuiPacoteCompletoSst: true,
  });
  const processo = buildRiscosPsicossociaisProcesso(
    buildLaudosSstProcesso(imp, {
      orcamento_id: "orc-normal",
      etapa_atual: "envio_cliente",
      etapas_concluidas: 6,
      status: "concluido",
      entrada_em: "2026-07-01T12:00:00Z",
    }),
    tracking("orc-normal", { lista_solicitada: true }),
    null
  );
  assert.notEqual(processo.status, "cancelado");
  assert.notEqual(processo.etapaAtual, "cancelado");
  assert.equal(processo.canceladoEm, null);
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([processo], "aberto").length,
    1
  );
  assert.equal(deveInserirTrackingRiscosNoSincronismo(true, tracking("orc-normal")), false);
  assert.equal(deveInserirTrackingRiscosNoSincronismo(true, null), true);
});

run("UI: menu Cancelar, filtro Cancelado, badge e faixa", () => {
  const menu = readFileSync(
    join(
      root,
      "components/riscos-psicossociais/RiscosProcessoRowActionsMenu.tsx"
    ),
    "utf8"
  );
  assert.match(menu, /mostrarCancelar/);
  assert.match(menu, /label="Cancelar"/);

  const table = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosPsicossociaisTable.tsx"),
    "utf8"
  );
  assert.match(table, />Cancelado</);
  assert.match(table, /value="cancelado"/);

  const painel = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosPsicossociaisPainel.tsx"),
    "utf8"
  );
  assert.match(painel, /Processo cancelado/);
  assert.match(painel, /motivoCancelamento/);

  const modal = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosCancelarProcessoModal.tsx"),
    "utf8"
  );
  assert.match(modal, /title="Cancelar processo"/);
  assert.match(modal, /Confirmar cancelamento/);
  assert.match(modal, /Voltar/);

  const vermelho =
    "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-extrabold bg-[#fef2f2] text-brand-red";
  assert.equal(
    riscosPsicossociaisEtapaAtualBadgeClass("cancelado", "cancelado"),
    vermelho
  );
});

run("TS2783: rota campanha/cancelar não duplica campanha", () => {
  const route = readFileSync(
    join(root, "app/api/riscos/campanha/[campanhaId]/cancelar/route.ts"),
    "utf8"
  );
  assert.doesNotMatch(route, /\.\.\.\s*result/);
  assert.match(route, /campanha: result\.campanha/);
});

console.log("\nTodos os testes de cancelamento de processo passaram.");
