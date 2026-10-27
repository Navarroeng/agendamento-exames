/** Fronteiras de mês do Dashboard (KPIs, recorte temporal e links). */

import assert from "node:assert/strict";
import { agendamentoFiltersFromSearchParams } from "../lib/agendamento-filters";
import {
  buildDashboardKpiDetailRows,
  buildDashboardKpiLists,
  buildDashboardKpis,
  filterDashboardKpiRowsBySearch,
} from "../lib/dashboard/aggregations";
import { buildDashboardCardHrefs } from "../lib/dashboard/links";
import {
  getDashboardMonthBounds,
  isCompetenciaMesAtual,
  isCompetenciaMesesAnteriores,
} from "../lib/dashboard/month-bounds";
import { esocialFiltersFromSearchParams } from "../lib/esocial-filters";
import { periodicoViewFromSearchParams } from "../lib/periodicos-futuro";
import type {
  AgendamentoWithExames,
  PeriodicoFuturoRecord,
} from "../lib/types";

let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(err);
  }
}

function agendamento(
  overrides: Partial<AgendamentoWithExames> &
    Pick<AgendamentoWithExames, "id" | "data_agendamento">
): AgendamentoWithExames {
  return {
    horario: "08:00",
    cliente_nome: "Cliente",
    colaborador: "Colaborador",
    colaborador_cpf: "123.456.789-00",
    aso: "Admissional",
    clinica_nome: "Clínica",
    responsavel: "Bruna",
    status: "agendado",
    observacoes: null,
    aso_enviado_clinica: false,
    data_aso_enviado_clinica: null,
    aso_assinado: false,
    data_aso_assinado: null,
    aso_enviado_cliente: false,
    data_aso_enviado_cliente: null,
    envio_esocial: false,
    data_envio_esocial: null,
    esocial_recibo: null,
    numero_matricula: null,
    cargo_id: null,
    cargo_nome: null,
    agendamento_exames: [],
    ...overrides,
  };
}

function periodico(
  overrides: Partial<PeriodicoFuturoRecord> &
    Pick<PeriodicoFuturoRecord, "id" | "proxima_data">
): PeriodicoFuturoRecord {
  return {
    agendamento_id: null,
    cliente_nome: "Cliente",
    colaborador: "Colaborador",
    cargo_id: null,
    cargo_nome: null,
    exame_id: null,
    tipo_exame: "Clínico",
    exame_nome: "Clínico",
    data_realizada: "2026-01-15",
    status: "ativo",
    ...overrides,
  };
}

test("agosto/2026: início 01/08 e fim 31/08", () => {
  const bounds = getDashboardMonthBounds("2026-08-15");
  assert.equal(bounds.inicioMesAtual, "2026-08-01");
  assert.equal(bounds.fimMesAtual, "2026-08-31");
  assert.equal(bounds.hojeIso, "2026-08-15");
});

test("dezembro → janeiro: virada de ano", () => {
  const dez = getDashboardMonthBounds("2026-12-20");
  assert.equal(dez.inicioMesAtual, "2026-12-01");
  assert.equal(dez.fimMesAtual, "2026-12-31");

  const jan = getDashboardMonthBounds("2027-01-05");
  assert.equal(jan.inicioMesAtual, "2027-01-01");
  assert.equal(jan.fimMesAtual, "2027-01-31");
  assert.equal(isCompetenciaMesesAnteriores("2026-12-31", jan.inicioMesAtual), true);
  assert.equal(isCompetenciaMesesAnteriores("2027-01-01", jan.inicioMesAtual), false);
});

test("fevereiro não-bissexto e bissexto", () => {
  const feb2026 = getDashboardMonthBounds("2026-02-10");
  assert.equal(feb2026.inicioMesAtual, "2026-02-01");
  assert.equal(feb2026.fimMesAtual, "2026-02-28");

  const feb2028 = getDashboardMonthBounds("2028-02-10");
  assert.equal(feb2028.inicioMesAtual, "2028-02-01");
  assert.equal(feb2028.fimMesAtual, "2028-02-29");
});

test("fronteira do mês: 31/07 entra em anteriores; 01/08 não", () => {
  const { inicioMesAtual, fimMesAtual } = getDashboardMonthBounds("2026-08-26");
  assert.equal(isCompetenciaMesesAnteriores("2026-07-31", inicioMesAtual), true);
  assert.equal(isCompetenciaMesesAnteriores("2026-08-01", inicioMesAtual), false);
  assert.equal(
    isCompetenciaMesAtual("2026-08-01", inicioMesAtual, fimMesAtual),
    true
  );
  assert.equal(
    isCompetenciaMesAtual("2026-08-31", inicioMesAtual, fimMesAtual),
    true
  );
  assert.equal(
    isCompetenciaMesAtual("2026-09-01", inicioMesAtual, fimMesAtual),
    false
  );
});

const agoraAgosto = "2026-08-15";

test("e-Social: 31/07 pendente entra; 01/08 pendente não entra", () => {
  const kpis = buildDashboardKpis(
    [
      agendamento({ id: "jul", data_agendamento: "2026-07-31", envio_esocial: false }),
      agendamento({ id: "ago", data_agendamento: "2026-08-01", envio_esocial: false }),
      agendamento({
        id: "jul-enviado",
        data_agendamento: "2026-07-31",
        envio_esocial: true,
      }),
      agendamento({
        id: "jul-cancelado",
        data_agendamento: "2026-07-31",
        status: "cancelado",
      }),
    ],
    [],
    agoraAgosto
  );
  assert.equal(kpis.pendenciasEsocial, 1);
});

test("ASO clínica: 31/07 sem recebimento entra; 01/08 não entra", () => {
  const kpis = buildDashboardKpis(
    [
      agendamento({
        id: "jul",
        data_agendamento: "2026-07-31",
        aso_assinado: false,
      }),
      agendamento({
        id: "ago",
        data_agendamento: "2026-08-01",
        aso_assinado: false,
      }),
      agendamento({
        id: "jul-ok",
        data_agendamento: "2026-07-31",
        aso_assinado: true,
      }),
    ],
    [],
    agoraAgosto
  );
  assert.equal(kpis.asosNaoRecebidosClinicas, 1);
});

test("ASO cliente: 31/07 não enviado entra; 01/08 não entra", () => {
  const kpis = buildDashboardKpis(
    [
      agendamento({
        id: "jul",
        data_agendamento: "2026-07-31",
        aso_enviado_cliente: false,
      }),
      agendamento({
        id: "ago",
        data_agendamento: "2026-08-01",
        aso_enviado_cliente: false,
      }),
      agendamento({
        id: "jul-ok",
        data_agendamento: "2026-07-31",
        aso_enviado_cliente: true,
      }),
    ],
    [],
    agoraAgosto
  );
  assert.equal(kpis.asosNaoEnviadosClientes, 1);
});

test("periódicos: 31/07 vencido; agosto no mês atual; 01/09 fora", () => {
  const kpis = buildDashboardKpis(
    [],
    [
      periodico({ id: "jul", proxima_data: "2026-07-31" }),
      periodico({ id: "ago-ini", proxima_data: "2026-08-01" }),
      periodico({ id: "ago-fim", proxima_data: "2026-08-31" }),
      periodico({ id: "set", proxima_data: "2026-09-01" }),
      periodico({
        id: "jul-reag",
        proxima_data: "2026-07-31",
        status: "reagendado",
      }),
      periodico({
        id: "jul-canc",
        proxima_data: "2026-07-31",
        status: "cancelado",
        cancelado_em: "2026-07-20",
        motivo_cancelamento: "Cancelado",
      }),
    ],
    agoraAgosto
  );
  assert.equal(kpis.periodicosVencidos, 1);
  assert.equal(kpis.periodicosVencendoMesAtual, 2);
});

test("listas do modal têm os mesmos registros da contagem dos cards", () => {
  const agendamentos = [
    agendamento({ id: "jul", data_agendamento: "2026-07-31", envio_esocial: false }),
    agendamento({ id: "ago", data_agendamento: "2026-08-01", envio_esocial: false }),
    agendamento({
      id: "jul-enviado",
      data_agendamento: "2026-07-31",
      envio_esocial: true,
      aso_assinado: true,
      aso_enviado_cliente: true,
    }),
    agendamento({
      id: "jul-cancelado",
      data_agendamento: "2026-07-31",
      status: "cancelado",
    }),
    agendamento({ id: "hoje", data_agendamento: "2026-08-15" }),
  ];
  const periodicos = [
    periodico({ id: "jul", proxima_data: "2026-07-31" }),
    periodico({ id: "ago", proxima_data: "2026-08-10" }),
    periodico({
      id: "jul-canc",
      proxima_data: "2026-07-31",
      status: "cancelado",
      cancelado_em: "2026-07-20",
      motivo_cancelamento: "Cancelado",
    }),
  ];
  const kpis = buildDashboardKpis(agendamentos, periodicos, agoraAgosto);
  const lists = buildDashboardKpiLists(agendamentos, periodicos, agoraAgosto);

  assert.equal(lists.pendenciasEsocial.length, kpis.pendenciasEsocial);
  assert.deepEqual(
    lists.pendenciasEsocial.map((row) => row.id),
    ["jul"]
  );
  assert.equal(lists.asosNaoRecebidosClinicas.length, kpis.asosNaoRecebidosClinicas);
  assert.deepEqual(
    lists.asosNaoRecebidosClinicas.map((row) => row.id),
    ["jul"]
  );
  assert.equal(lists.asosNaoEnviadosClientes.length, kpis.asosNaoEnviadosClientes);
  assert.deepEqual(
    lists.asosNaoEnviadosClientes.map((row) => row.id),
    ["jul"]
  );
  assert.equal(lists.periodicosVencidos.length, kpis.periodicosVencidos);
  assert.deepEqual(
    lists.periodicosVencidos.map((row) => row.id),
    ["jul"]
  );
  assert.equal(
    lists.periodicosVencendoMesAtual.length,
    kpis.periodicosVencendoMesAtual
  );
  assert.deepEqual(
    lists.periodicosVencendoMesAtual.map((row) => row.id),
    ["ago"]
  );
  assert.equal(lists.agendamentosDoDia.length, kpis.agendamentosDoDia);
  assert.deepEqual(
    lists.agendamentosDoDia.map((row) => row.id),
    ["hoje"]
  );
});

test("detalhe e-Social usa status do módulo e não mistura competência atual", () => {
  const rows = buildDashboardKpiDetailRows(
    "pendenciasEsocial",
    [
      agendamento({
        id: "jul",
        data_agendamento: "2026-07-31",
        colaborador: "ISABEL TELES",
        cliente_nome: "PORTAL DO CRESCER",
        envio_esocial: false,
      }),
      agendamento({
        id: "ago",
        data_agendamento: "2026-08-01",
        colaborador: "OUTRO",
        envio_esocial: false,
      }),
    ],
    [],
    agoraAgosto
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "jul");
  assert.equal(rows[0].colaborador, "ISABEL TELES");
  assert.ok(["Pendente", "Enviar urgente"].includes(rows[0].status));
});

test("busca do modal filtra colaborador/empresa sem alterar a lista-fonte", () => {
  const rows = buildDashboardKpiDetailRows(
    "agendamentosDoDia",
    [
      agendamento({
        id: "a",
        data_agendamento: "2026-08-15",
        colaborador: "ISABEL TELES",
        cliente_nome: "PORTAL DO CRESCER",
      }),
      agendamento({
        id: "b",
        data_agendamento: "2026-08-15",
        colaborador: "MARIA SILVA",
        cliente_nome: "OUTRA EMPRESA",
      }),
    ],
    [],
    agoraAgosto
  );
  assert.equal(rows.length, 2);
  const filtrados = filterDashboardKpiRowsBySearch(rows, "isabel");
  assert.deepEqual(
    filtrados.map((row) => row.id),
    ["a"]
  );
  const empresa = filterDashboardKpiRowsBySearch(rows, "portal");
  assert.deepEqual(
    empresa.map((row) => row.id),
    ["a"]
  );
  assert.equal(filterDashboardKpiRowsBySearch(rows, "inexistente").length, 0);
});

test("modal vazio quando o indicador é zero", () => {
  const rows = buildDashboardKpiDetailRows("periodicosVencidos", [], [], agoraAgosto);
  assert.equal(rows.length, 0);
});

test("agendamentos de hoje usa a data de referência, não o mês inteiro", () => {
  const kpis = buildDashboardKpis(
    [
      agendamento({ id: "hoje", data_agendamento: "2026-08-15" }),
      agendamento({ id: "ontem", data_agendamento: "2026-08-14" }),
      agendamento({
        id: "hoje-canc",
        data_agendamento: "2026-08-15",
        status: "cancelado",
      }),
    ],
    [],
    agoraAgosto
  );
  assert.equal(kpis.agendamentosDoDia, 1);
});

test("links dos cards usam filtros já existentes nas páginas", () => {
  const hrefs = buildDashboardCardHrefs(agoraAgosto);
  const esocial = new URL(hrefs.esocial, "https://navarro.local");
  assert.equal(esocial.pathname, "/e-social");
  assert.equal(esocial.searchParams.get("statusEsocial"), "acao");
  assert.equal(esocial.searchParams.get("dataFim"), "31/07/2026");
  assert.equal(esocial.searchParams.get("mesReferencia"), "");

  const clinica = new URL(hrefs.asosClinica, "https://navarro.local");
  assert.equal(clinica.pathname, "/");
  assert.equal(clinica.searchParams.get("pendencia"), "ASO Assinado");
  assert.equal(clinica.searchParams.get("pendenciaSituacao"), "pendente");
  assert.equal(clinica.searchParams.get("mesReferencia"), "");

  const cliente = new URL(hrefs.asosCliente, "https://navarro.local");
  assert.equal(cliente.searchParams.get("pendencia"), "ASO Cliente");

  const vencidos = new URL(hrefs.periodicosVencidos, "https://navarro.local");
  assert.equal(vencidos.pathname, "/periodicos-futuros");
  assert.equal(vencidos.searchParams.get("status"), "vencido");

  const mesAtual = new URL(hrefs.periodicosMesAtual, "https://navarro.local");
  assert.equal(mesAtual.searchParams.get("ano"), "2026");
  assert.equal(mesAtual.searchParams.get("mes"), "8");

  assert.equal(hrefs.agendamentosHoje, "/");
});

test("e-Social hidrata dataFim e limpa mês de referência", () => {
  const hrefs = buildDashboardCardHrefs(agoraAgosto);
  const params = new URL(hrefs.esocial, "https://navarro.local").searchParams;
  const parsed = esocialFiltersFromSearchParams(params);
  assert.equal(parsed.filters.statusEsocial, "acao");
  assert.equal(parsed.filters.dataFim, "31/07/2026");
  assert.equal(parsed.filters.mesReferencia, "");
  assert.equal(parsed.expanded, true);
});

test("Agendamentos hidrata pendência ASO Assinado sem mês", () => {
  const hrefs = buildDashboardCardHrefs(agoraAgosto);
  const params = new URL(hrefs.asosClinica, "https://navarro.local").searchParams;
  const parsed = agendamentoFiltersFromSearchParams(params);
  assert.equal(parsed.filters.pendencia, "ASO Assinado");
  assert.equal(parsed.filters.pendenciaSituacao, "pendente");
  assert.equal(parsed.filters.mesReferencia, "");
  assert.equal(parsed.expanded, true);
});

test("Periódicos hidrata status vencido e mês atual", () => {
  const hrefs = buildDashboardCardHrefs(agoraAgosto);
  const vencidos = periodicoViewFromSearchParams(
    new URL(hrefs.periodicosVencidos, "https://navarro.local").searchParams,
    new Date(2026, 7, 15)
  );
  assert.equal(vencidos.activeCard, "vencido");

  const mes = periodicoViewFromSearchParams(
    new URL(hrefs.periodicosMesAtual, "https://navarro.local").searchParams,
    new Date(2026, 7, 15)
  );
  assert.deepEqual(mes.mesSelecionado, { year: 2026, month: 8 });
  assert.equal(mes.activeCard, "");
});

if (failed > 0) {
  console.error(`\n${failed} teste(s) falharam.`);
  process.exit(1);
}

console.log("\ntest-dashboard-aggregations: OK");
