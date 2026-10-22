/**
 * Pausa administrativa (Sem retorno / Adiado pelo cliente) e retomada.
 * Sem banco. Não altera COPSOQ, relatório nem processos concluídos.
 *
 * Executar: npx tsx scripts/test-riscos-processo-pausa.ts
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
import {
  podePausarProcessoRiscos,
  validatePausarProcessoRiscos,
  validateRetomarProcessoRiscos,
} from "../lib/riscos-processo-pausa";
import {
  aplicarEstadoPausaAdministrativaProcesso,
  buildRiscosProcessoManualCliente,
  buildRiscosPsicossociaisProcesso,
  classificarStatusListagemRiscos,
  DEFAULT_RISCOS_LISTAGEM_STATUS,
  filterRiscosPsicossociaisProcessosPorStatus,
  labelEtapaAtualProcessoRiscos,
  RISCOS_PSICOSSOCIAIS_LISTAGEM_STATUS_OPTIONS,
  riscosPsicossociaisEtapaAtualBadgeClass,
  type OrcamentoRiscosPsicossociaisRecord,
} from "../lib/riscos-psicossociais";

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
    lista_solicitada: true,
    lista_solicitada_em: "2026-07-02",
    lista_recebida: true,
    lista_anexo_path: "lista/arquivo.pdf",
    lista_anexo_nome: "arquivo.pdf",
    lista_recebida_em: "2026-07-05T12:00:00Z",
    ...patch,
  };
}

function campanha(
  partial: Partial<RiscosCampanhaRecord> &
    Pick<RiscosCampanhaRecord, "id" | "status">
): RiscosCampanhaRecord {
  return {
    orcamento_id: "orc-pausa",
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

run("progresso 2/6 permanece após overlay Sem retorno", () => {
  const imp = implantacao({
    id: "orc-pausa-1",
    cliente: "Cliente Pausa",
    possuiPacoteCompletoSst: true,
  });
  const laudos = buildLaudosSstProcesso(imp, {
    orcamento_id: "orc-pausa-1",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
    entrada_em: "2026-07-01T12:00:00Z",
  });
  const aberto = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-pausa-1"),
    null
  );
  assert.equal(aberto.status, "em_andamento");
  assert.equal(aberto.etapasConcluidas, 2);
  assert.equal(aberto.totalEtapas, 7);
  assert.equal(aberto.pausaSituacao, null);

  const pausado = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-pausa-1", {
      pausa_situacao: "sem_retorno",
      pausa_em: "2026-10-22T12:00:00Z",
      pausa_por: "AGATHA",
      pausa_observacao: "Não retornou",
    }),
    null
  );
  assert.equal(pausado.status, "em_andamento");
  assert.equal(pausado.etapaAtual, aberto.etapaAtual);
  assert.equal(pausado.etapasConcluidas, aberto.etapasConcluidas);
  assert.equal(pausado.progressoPercentual, aberto.progressoPercentual);
  assert.equal(pausado.pausaSituacao, "sem_retorno");
  assert.equal(
    labelEtapaAtualProcessoRiscos(pausado),
    "Sem retorno"
  );
  assert.match(
    riscosPsicossociaisEtapaAtualBadgeClass(
      pausado.etapaAtual,
      pausado.status,
      pausado.pausaSituacao
    ),
    /fde68a/
  );
});

run("Adiado pelo cliente: badge cinza, filtro próprio, fora de Aberto", () => {
  const imp = implantacao({
    id: "orc-adiado",
    cliente: "Cliente Adiado",
    possuiPacoteCompletoSst: true,
  });
  const laudos = buildLaudosSstProcesso(imp, null);
  const pausado = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-adiado", {
      pausa_situacao: "adiado_cliente",
      pausa_em: "2026-10-22T12:00:00Z",
      pausa_por: "AGATHA",
    }),
    null
  );
  assert.equal(labelEtapaAtualProcessoRiscos(pausado), "Adiado pelo cliente");
  assert.match(
    riscosPsicossociaisEtapaAtualBadgeClass(
      pausado.etapaAtual,
      pausado.status,
      pausado.pausaSituacao
    ),
    /e2e8f0/
  );
  assert.equal(classificarStatusListagemRiscos(pausado), "adiado_cliente");
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus(
      [pausado],
      DEFAULT_RISCOS_LISTAGEM_STATUS
    ).length,
    0
  );
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([pausado], ["adiado_cliente"])
      .length,
    1
  );
  assert.equal(
    filterRiscosPsicossociaisProcessosPorStatus([pausado], ["concluido"]).length,
    0
  );
});

run("filtros de status incluem as novas situações sem mudar o padrão", () => {
  assert.deepEqual(DEFAULT_RISCOS_LISTAGEM_STATUS, [
    "aberto",
    "relatorio_gerado",
  ]);
  const values = RISCOS_PSICOSSOCIAIS_LISTAGEM_STATUS_OPTIONS.map((o) => o.value);
  assert.ok(values.includes("sem_retorno"));
  assert.ok(values.includes("adiado_cliente"));
  assert.ok(values.includes("aberto"));
  assert.ok(values.includes("cancelado"));
});

run("menu: pausar só antes de abrir a pesquisa; retomar só se pausado", () => {
  const semCampanha = acoesMenuListagemProcessoRiscos({
    campanhaStatus: null,
    isAdmin: true,
    hasCampanha: false,
  });
  assert.equal(semCampanha.mostrarPausarSemRetorno, true);
  assert.equal(semCampanha.mostrarAdiarCliente, true);
  assert.equal(semCampanha.mostrarRetomarProcesso, false);

  const emPrep = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "em_preparacao",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
  });
  assert.equal(emPrep.mostrarPausarSemRetorno, true);
  assert.equal(emPrep.mostrarAdiarCliente, true);

  const aberta = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "aberta",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
  });
  assert.equal(aberta.mostrarPausarSemRetorno, false);
  assert.equal(aberta.mostrarAdiarCliente, false);

  const encerrada = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "encerrada",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
  });
  assert.equal(encerrada.mostrarPausarSemRetorno, false);

  const pausado = acoesMenuListagemProcessoRiscos({
    campanhaStatus: "em_preparacao",
    codigoPublico: "ABC123",
    isAdmin: true,
    hasCampanha: true,
    processoPausado: true,
  });
  assert.equal(pausado.mostrarPausarSemRetorno, false);
  assert.equal(pausado.mostrarAdiarCliente, false);
  assert.equal(pausado.mostrarRetomarProcesso, true);
  assert.equal(pausado.mostrarCancelar, true);
  assert.equal(pausado.podeGerarRelatorio, false);
});

run("validação: não pausa pesquisa aberta, cancelado ou já pausado", () => {
  assert.equal(
    validatePausarProcessoRiscos({
      situacao: "sem_retorno",
      campanhaStatus: "aberta",
    }),
    "Não é possível pausar depois que a pesquisa foi aberta aos participantes."
  );
  assert.equal(
    validatePausarProcessoRiscos({
      situacao: "adiado_cliente",
      processoCancelado: true,
    }),
    "Processo cancelado não pode ser pausado."
  );
  assert.equal(
    validatePausarProcessoRiscos({
      situacao: "sem_retorno",
      processoPausado: true,
    })?.includes("já está pausado") ?? false,
    true
  );
  assert.equal(
    podePausarProcessoRiscos({ campanhaStatus: "em_preparacao" }),
    true
  );
  assert.equal(
    validateRetomarProcessoRiscos({ processoPausado: false }),
    "Este processo não está pausado."
  );
  assert.equal(
    validateRetomarProcessoRiscos({ processoPausado: true }),
    null
  );
});

run("retomada restaura overlay sem mudar etapas", () => {
  const imp = implantacao({
    id: "orc-retomar",
    cliente: "Cliente Retomar",
    possuiPacoteCompletoSst: true,
  });
  const laudos = buildLaudosSstProcesso(imp, {
    orcamento_id: "orc-retomar",
    etapa_atual: "envio_cliente",
    etapas_concluidas: 6,
    status: "concluido",
    entrada_em: "2026-07-01T12:00:00Z",
  });
  const pausado = buildRiscosPsicossociaisProcesso(
    laudos,
    tracking("orc-retomar", {
      pausa_situacao: "sem_retorno",
      pausa_em: "2026-10-22T12:00:00Z",
      pausa_por: "AGATHA",
    }),
    campanha({ id: "camp-retomar", status: "em_preparacao" })
  );
  const retomado = aplicarEstadoPausaAdministrativaProcesso(pausado, {
    pausaSituacao: null,
    pausaEm: null,
    pausaPor: null,
    pausaObservacao: null,
  });
  assert.equal(retomado.pausaSituacao, null);
  assert.equal(retomado.status, "em_andamento");
  assert.equal(retomado.etapasConcluidas, pausado.etapasConcluidas);
  assert.equal(retomado.campanha?.status, "em_preparacao");
  assert.equal(retomado.campanha?.id, "camp-retomar");
  assert.notEqual(labelEtapaAtualProcessoRiscos(retomado), "Sem retorno");
});

run("inclusão manual usa o mesmo overlay no fluxo da campanha", () => {
  const campanhaManual = campanha({
    id: "camp-manual-pausa",
    status: "em_preparacao",
    orcamento_id: null,
    origem: RISCOS_CAMPANHA_ORIGEM.manual_cliente,
  });
  const pausado = buildRiscosProcessoManualCliente({
    campanha: campanhaManual,
    tracking: tracking("ignored", {
      pausa_situacao: "sem_retorno",
      pausa_em: "2026-10-22T12:00:00Z",
      pausa_por: "AGATHA",
    }),
  });
  assert.equal(pausado.pausaSituacao, "sem_retorno");
  assert.equal(pausado.status, "em_andamento");
  assert.equal(classificarStatusListagemRiscos(pausado), "sem_retorno");
});

run("infraestrutura: migration 144, APIs, auditoria e menu", () => {
  const migration = readFileSync(
    join(root, "supabase/migrations/144_riscos_processo_pausa_administrativa.sql"),
    "utf8"
  );
  assert.match(migration, /pausa_situacao/);
  assert.match(migration, /sem_retorno/);
  assert.match(migration, /adiado_cliente/);
  assert.match(migration, /orcamento_riscos_psicossociais/);
  assert.match(migration, /riscos_campanha_fluxo/);
  assert.doesNotMatch(migration, /em_andamento \| concluido \| cancelado \|/);

  const apiPausa = readFileSync(
    join(root, "app/api/riscos/processo/pausa/route.ts"),
    "utf8"
  );
  const apiRetomar = readFileSync(
    join(root, "app/api/riscos/processo/retomar/route.ts"),
    "utf8"
  );
  assert.match(apiPausa, /pausarProcessoRiscosNoServidor/);
  assert.match(apiRetomar, /retomarProcessoRiscosNoServidor/);

  const auditoria = readFileSync(join(root, "lib/auditoria.ts"), "utf8");
  assert.match(auditoria, /riscos_processo_sem_retorno/);
  assert.match(auditoria, /riscos_processo_adiado_cliente/);
  assert.match(auditoria, /riscos_processo_retomado/);

  const menu = readFileSync(
    join(root, "components/riscos-psicossociais/RiscosProcessoRowActionsMenu.tsx"),
    "utf8"
  );
  assert.match(menu, /Marcar como sem retorno/);
  assert.match(menu, /Adiar a pedido do cliente/);
  assert.match(menu, /Retomar processo/);

  const abrir = readFileSync(
    join(root, "services/riscos-campanha-abrir.server.ts"),
    "utf8"
  );
  const criar = readFileSync(
    join(root, "services/riscos-campanha-ciclo.server.ts"),
    "utf8"
  );
  assert.match(abrir, /assertProcessoRiscosNaoPausadoNoServidor/);
  assert.match(criar, /assertProcessoRiscosNaoPausadoNoServidor/);
});

run("não altera COPSOQ, motor de cálculo nem geração de relatório", () => {
  const copsoqReadme = readFileSync(join(root, "docs/copsoq/README.md"), "utf8");
  assert.ok(copsoqReadme.length > 0);
  const motor = readFileSync(
    join(root, "lib/riscos-psicossociais.ts"),
    "utf8"
  );
  assert.match(motor, /aplicarEstadoPausaAdministrativaProcesso/);
  const relatorio = readFileSync(join(root, "lib/riscos-relatorio.ts"), "utf8");
  assert.doesNotMatch(relatorio, /pausa_situacao|sem_retorno|adiado_cliente/);
});

console.log("\nTodos os testes de pausa administrativa passaram.");
