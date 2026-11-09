/**
 * Procuração Pendente no e-Social: status, filtro, contadores, retomada e dashboard.
 * Executar: npx tsx scripts/test-esocial-procuracao-pendente.ts
 */
import assert from "node:assert/strict";
import {
  buildDashboardKpiDetailRows,
  buildDashboardKpis,
} from "../lib/dashboard/aggregations";
import { condicoesStatusEsocial } from "../lib/esocial-consulta";
import {
  ESOCIAL_VISUAL_STATUS_LABELS,
  computeESocialSummary,
  filterAgendamentosESocial,
  getESocialVisualStatus,
  payloadEsocialProcuracaoPendente,
  podeMarcarEsocialProcuracaoPendente,
  podeRetomarEnvioEsocial,
  type ESocialFilters,
} from "../lib/esocial-filters";
import type { AgendamentoWithExames } from "../lib/types";

const AGORA = new Date("2026-11-09T15:00:00.000Z");

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function mockAgendamento(
  partial: Partial<AgendamentoWithExames> & { id: string }
): AgendamentoWithExames {
  return {
    data_agendamento: "2026-11-01",
    horario: "09:00",
    cliente_nome: "Empresa Teste",
    colaborador: "Colaborador",
    colaborador_cpf: "00000000000",
    aso: "Admissional",
    clinica_nome: "Clínica",
    responsavel: "Resp",
    observacoes: null,
    aso_enviado_clinica: false,
    data_aso_enviado_clinica: null,
    aso_assinado: false,
    data_aso_assinado: null,
    aso_enviado_cliente: false,
    data_aso_enviado_cliente: null,
    numero_matricula: null,
    envio_esocial: false,
    data_envio_esocial: null,
    esocial_recibo: null,
    esocial_envio_cancelado: false,
    esocial_procuracao_pendente: false,
    status: "agendado",
    agendamento_exames: [],
    ...partial,
  };
}

function filtros(
  statusEsocial: ESocialFilters["statusEsocial"]
): ESocialFilters {
  return {
    cliente: "",
    colaborador: "",
    statusEsocial,
    mesReferencia: "",
    dataInicio: "",
    dataFim: "",
  };
}

const urgente = mockAgendamento({
  id: "urg",
  colaborador: "Urgente",
  data_agendamento: "2026-07-01",
});
const pendente = mockAgendamento({
  id: "pen",
  colaborador: "Pendente",
  data_agendamento: "2026-11-01",
});
const procuracaoAntiga = mockAgendamento({
  id: "proc-antiga",
  colaborador: "Procuração antiga",
  cliente_nome: "Empresa Teste",
  data_agendamento: "2026-07-01",
  esocial_procuracao_pendente: true,
});
const procuracaoRecente = mockAgendamento({
  id: "proc-recente",
  colaborador: "Procuração recente",
  data_agendamento: "2026-11-01",
  esocial_procuracao_pendente: true,
});
const enviado = mockAgendamento({
  id: "env",
  colaborador: "Enviado",
  envio_esocial: true,
  data_envio_esocial: "2026-07-20",
  esocial_recibo: "1.2.3",
  data_agendamento: "2026-07-01",
});
const enviadoComFlag = mockAgendamento({
  id: "env-flag",
  colaborador: "Enviado com flag",
  envio_esocial: true,
  data_envio_esocial: "2026-07-20",
  esocial_recibo: "9.9.9",
  data_agendamento: "2026-07-01",
  esocial_procuracao_pendente: true,
});
const cancelado = mockAgendamento({
  id: "can",
  colaborador: "Cancelado",
  esocial_envio_cancelado: true,
  data_agendamento: "2026-07-01",
  esocial_procuracao_pendente: true,
});
const outroDaEmpresa = mockAgendamento({
  id: "outro",
  colaborador: "Outro da empresa",
  cliente_nome: "Empresa Teste",
  data_agendamento: "2026-07-01",
  esocial_procuracao_pendente: false,
});

run("procuração prevalece sobre urgente e pendente e preserva a data", () => {
  assert.equal(getESocialVisualStatus(urgente, AGORA), "urgente");
  assert.equal(getESocialVisualStatus(pendente, AGORA), "pendente");
  assert.equal(
    getESocialVisualStatus(procuracaoAntiga, AGORA),
    "procuracao_pendente"
  );
  assert.equal(
    getESocialVisualStatus(procuracaoRecente, AGORA),
    "procuracao_pendente"
  );
  assert.equal(procuracaoAntiga.data_agendamento, "2026-07-01");
  assert.equal(procuracaoAntiga.envio_esocial, false);
  assert.equal(procuracaoAntiga.data_envio_esocial, null);
  assert.equal(procuracaoAntiga.esocial_recibo, null);
});

run("enviado e cancelado não viram procuração pendente", () => {
  assert.equal(getESocialVisualStatus(enviado, AGORA), "enviado");
  assert.equal(getESocialVisualStatus(enviadoComFlag, AGORA), "enviado");
  assert.equal(getESocialVisualStatus(cancelado, AGORA), "cancelado");
  assert.equal(podeMarcarEsocialProcuracaoPendente(urgente, AGORA), true);
  assert.equal(podeMarcarEsocialProcuracaoPendente(pendente, AGORA), true);
  assert.equal(
    podeMarcarEsocialProcuracaoPendente(procuracaoAntiga, AGORA),
    false
  );
  assert.equal(podeMarcarEsocialProcuracaoPendente(enviado, AGORA), false);
  assert.equal(
    podeMarcarEsocialProcuracaoPendente(enviadoComFlag, AGORA),
    false
  );
  assert.equal(podeMarcarEsocialProcuracaoPendente(cancelado, AGORA), false);
});

run("retomar recalcula pela data original e não mexe nos outros ASOs", () => {
  assert.equal(podeRetomarEnvioEsocial(procuracaoAntiga, AGORA), true);
  assert.equal(podeRetomarEnvioEsocial(procuracaoRecente, AGORA), true);
  assert.equal(podeRetomarEnvioEsocial(urgente, AGORA), false);
  assert.equal(podeRetomarEnvioEsocial(enviadoComFlag, AGORA), false);

  const retomadaAntiga = {
    ...procuracaoAntiga,
    ...payloadEsocialProcuracaoPendente(false),
  };
  const retomadaRecente = {
    ...procuracaoRecente,
    ...payloadEsocialProcuracaoPendente(false),
  };
  assert.equal(getESocialVisualStatus(retomadaAntiga, AGORA), "urgente");
  assert.equal(getESocialVisualStatus(retomadaRecente, AGORA), "pendente");
  assert.equal(retomadaAntiga.data_agendamento, "2026-07-01");
  assert.equal(retomadaRecente.data_agendamento, "2026-11-01");
  assert.equal(retomadaAntiga.envio_esocial, false);
  assert.equal(retomadaAntiga.data_envio_esocial, null);
  assert.equal(retomadaAntiga.esocial_recibo, null);

  const marcados = [procuracaoAntiga, outroDaEmpresa].map((item) =>
    item.id === procuracaoAntiga.id
      ? { ...item, ...payloadEsocialProcuracaoPendente(true) }
      : item
  );
  assert.equal(marcados[1].id, "outro");
  assert.equal(marcados[1].esocial_procuracao_pendente, false);
  assert.equal(getESocialVisualStatus(marcados[1], AGORA), "urgente");
  assert.deepEqual(Object.keys(payloadEsocialProcuracaoPendente(true)), [
    "esocial_procuracao_pendente",
  ]);
});

run("contadores separam procuração e mantêm total e percentual", () => {
  const summary = computeESocialSummary(
    [
      enviado,
      pendente,
      urgente,
      procuracaoAntiga,
      procuracaoRecente,
      cancelado,
    ],
    AGORA
  );
  assert.equal(summary.enviados, 1);
  assert.equal(summary.pendentes, 1);
  assert.equal(summary.enviarUrgente, 1);
  assert.equal(summary.procuracaoPendente, 2);
  assert.equal(summary.cancelados, 1);
  assert.equal(summary.totalElegivel, 5);
  assert.equal(
    summary.totalElegivel,
    summary.enviados +
      summary.pendentes +
      summary.enviarUrgente +
      summary.procuracaoPendente
  );
  assert.equal(summary.percentualEnviado, 20);
});

run("filtro isola procuração e a fila de ação continua incluindo o ASO", () => {
  const lista = [urgente, pendente, procuracaoAntiga, enviado, cancelado];
  assert.deepEqual(
    filterAgendamentosESocial(lista, filtros("procuracao_pendente"), AGORA).map(
      (item) => item.id
    ),
    ["proc-antiga"]
  );
  assert.deepEqual(
    filterAgendamentosESocial(lista, filtros("urgente"), AGORA).map(
      (item) => item.id
    ),
    ["urg"]
  );
  assert.deepEqual(
    filterAgendamentosESocial(lista, filtros("pendente"), AGORA).map(
      (item) => item.id
    ),
    ["pen"]
  );
  assert.deepEqual(
    filterAgendamentosESocial(lista, filtros("acao"), AGORA)
      .map((item) => item.id)
      .sort(),
    ["pen", "proc-antiga", "urg"]
  );
  assert.equal(
    ESOCIAL_VISUAL_STATUS_LABELS.procuracao_pendente,
    "Procuração Pendente"
  );
});

run("consulta do banco separa procuração de urgente e pendente", () => {
  const urgenteCond = condicoesStatusEsocial("urgente", "2026-11-09");
  const pendenteCond = condicoesStatusEsocial("pendente", "2026-11-09");
  const procCond = condicoesStatusEsocial("procuracao_pendente", "2026-11-09");
  const acaoCond = condicoesStatusEsocial("acao", "2026-11-09");

  assert.ok(
    urgenteCond.some(
      (item) =>
        item.op === "notEq" &&
        item.coluna === "esocial_procuracao_pendente" &&
        item.valor === true
    )
  );
  assert.ok(
    pendenteCond.some(
      (item) =>
        item.op === "notEq" && item.coluna === "esocial_procuracao_pendente"
    )
  );
  assert.ok(
    procCond.some(
      (item) =>
        item.op === "eq" &&
        item.coluna === "esocial_procuracao_pendente" &&
        item.valor === true
    )
  );
  assert.ok(
    procCond.some(
      (item) => item.op === "notEq" && item.coluna === "envio_esocial"
    )
  );
  assert.ok(
    procCond.some(
      (item) =>
        item.op === "notEq" && item.coluna === "esocial_envio_cancelado"
    )
  );
  assert.equal(
    acaoCond.some(
      (item) =>
        "coluna" in item && item.coluna === "esocial_procuracao_pendente"
    ),
    false
  );
});

run("dashboard não apresenta procuração pendente como urgente", () => {
  const registros = [
    mockAgendamento({
      id: "proc-dash",
      colaborador: "COM PROCURACAO",
      data_agendamento: "2020-01-15",
      esocial_procuracao_pendente: true,
    }),
    mockAgendamento({
      id: "urg-dash",
      colaborador: "SEM PROCURACAO",
      data_agendamento: "2020-01-16",
    }),
  ];
  const kpis = buildDashboardKpis(registros, [], "2026-11-09");
  const rows = buildDashboardKpiDetailRows(
    "pendenciasEsocial",
    registros,
    [],
    "2026-11-09"
  );
  assert.equal(kpis.pendenciasEsocial, 2);
  const proc = rows.find((row) => row.id === "proc-dash");
  const urg = rows.find((row) => row.id === "urg-dash");
  assert.ok(proc);
  assert.ok(urg);
  assert.equal(proc.status, "Procuração Pendente");
  assert.equal(proc.statusTone, "pending");
  assert.notEqual(proc.status, "Enviar urgente");
  assert.equal(urg.status, "Enviar urgente");
  assert.equal(urg.statusTone, "overdue");
});

console.log("\nTodos os testes de procuração pendente no e-Social passaram.");
