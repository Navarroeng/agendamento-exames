/**
 * KPIs e-Social: totalElegivel, cancelados e percentual.
 * Executar: npx tsx scripts/test-esocial-kpi-summary.ts
 */
import assert from "node:assert/strict";
import {
  computeESocialSummary,
  filterAgendamentosESocial,
} from "../lib/esocial-filters";
import type { AgendamentoWithExames } from "../lib/types";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function mockAgendamento(
  partial: Partial<AgendamentoWithExames> & { id: string }
): AgendamentoWithExames {
  return {
    data_agendamento: "2026-07-15",
    horario: "09:00",
    cliente_nome: "Cliente",
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
    status: "agendado",
    agendamento_exames: [],
    ...partial,
  };
}

run("jul/2026 — 101 enviados + 1 urgente + 8 cancelados", () => {
  const agendamentos: AgendamentoWithExames[] = [];

  for (let i = 0; i < 101; i += 1) {
    agendamentos.push(
      mockAgendamento({
        id: `env-${i}`,
        data_agendamento: "2026-07-10",
        envio_esocial: true,
        data_envio_esocial: "2026-07-20",
      })
    );
  }

  agendamentos.push(
    mockAgendamento({
      id: "urg-1",
      data_agendamento: "2026-07-01",
      envio_esocial: false,
    })
  );

  for (let i = 0; i < 8; i += 1) {
    agendamentos.push(
      mockAgendamento({
        id: `canc-${i}`,
        data_agendamento: "2026-07-12",
        esocial_envio_cancelado: true,
        envio_esocial: false,
      })
    );
  }

  const summary = computeESocialSummary(agendamentos);

  assert.equal(summary.enviados, 101);
  assert.equal(summary.pendentes, 0);
  assert.equal(summary.enviarUrgente, 1);
  assert.equal(summary.cancelados, 8);
  assert.equal(summary.totalElegivel, 102);
  assert.equal(summary.percentualEnviado, 99);
  assert.equal(
    summary.totalElegivel + summary.cancelados,
    agendamentos.length,
    "102 elegíveis + 8 cancelados = 110"
  );
});

run("cancelados não entram no denominador do percentual", () => {
  const agendamentos = [
    mockAgendamento({ id: "e1", envio_esocial: true, data_agendamento: "2026-07-05" }),
    mockAgendamento({
      id: "c1",
      esocial_envio_cancelado: true,
      envio_esocial: true,
      data_agendamento: "2026-07-06",
    }),
  ];

  const summary = computeESocialSummary(agendamentos);
  assert.equal(summary.totalElegivel, 1);
  assert.equal(summary.enviados, 1);
  assert.equal(summary.cancelados, 1);
  assert.equal(summary.percentualEnviado, 100);
});

run("cancelados não entram em pendentes/urgentes/enviados", () => {
  const agendamentos = [
    mockAgendamento({
      id: "c1",
      esocial_envio_cancelado: true,
      envio_esocial: false,
      data_agendamento: "2026-06-01",
    }),
    mockAgendamento({
      id: "c2",
      esocial_envio_cancelado: true,
      envio_esocial: true,
      data_agendamento: "2026-07-01",
    }),
  ];

  const summary = computeESocialSummary(agendamentos);
  assert.equal(summary.pendentes, 0);
  assert.equal(summary.enviarUrgente, 0);
  assert.equal(summary.enviados, 0);
  assert.equal(summary.cancelados, 2);
  assert.equal(summary.totalElegivel, 0);
});

run("totalElegivel = enviados + pendentes + urgentes", () => {
  const agendamentos = [
    mockAgendamento({ id: "e1", envio_esocial: true, data_agendamento: "2026-07-10" }),
    mockAgendamento({ id: "p1", envio_esocial: false, data_agendamento: "2026-08-28" }),
    mockAgendamento({ id: "u1", envio_esocial: false, data_agendamento: "2026-07-01" }),
    mockAgendamento({ id: "c1", esocial_envio_cancelado: true, data_agendamento: "2026-07-05" }),
  ];

  const summary = computeESocialSummary(agendamentos);
  assert.equal(
    summary.totalElegivel,
    summary.enviados + summary.pendentes + summary.enviarUrgente
  );
});

run("nenhum elegível → percentual = 0", () => {
  const summary = computeESocialSummary([
    mockAgendamento({ id: "c1", esocial_envio_cancelado: true }),
  ]);
  assert.equal(summary.totalElegivel, 0);
  assert.equal(summary.percentualEnviado, 0);
});

run("somente enviados → percentual = 100%", () => {
  const summary = computeESocialSummary([
    mockAgendamento({ id: "e1", envio_esocial: true, data_agendamento: "2026-07-10" }),
    mockAgendamento({ id: "e2", envio_esocial: true, data_agendamento: "2026-07-11" }),
  ]);
  assert.equal(summary.totalElegivel, 2);
  assert.equal(summary.percentualEnviado, 100);
});

run("filtro mensal continua usando data_agendamento", () => {
  const agendamentos = [
    mockAgendamento({
      id: "jul",
      data_agendamento: "2026-07-20",
      envio_esocial: true,
      created_at: "2026-08-01T12:00:00.000Z",
      esocial_entrada_em: "2026-08-01T12:00:00.000Z",
    }),
    mockAgendamento({
      id: "ago",
      data_agendamento: "2026-08-04",
      created_at: "2026-07-31T19:51:00.000Z",
      esocial_entrada_em: "2026-07-31T19:51:00.000Z",
      envio_esocial: true,
    }),
  ];

  const julho = filterAgendamentosESocial(agendamentos, {
    cliente: "",
    colaborador: "",
    statusEsocial: "todos",
    mesReferencia: "07/2026",
    dataInicio: "",
    dataFim: "",
  });

  const summary = computeESocialSummary(julho);
  assert.equal(julho.length, 1);
  assert.equal(julho[0].id, "jul");
  assert.equal(summary.totalElegivel, 1);
  assert.equal(summary.enviados, 1);
});

console.log("\nTodos os testes de KPI e-Social passaram.");
