/**
 * Filtro mensal e-Social: competência pela data do exame (data_agendamento).
 * Executar: npx tsx scripts/test-esocial-filtro-periodo.ts
 */
import assert from "node:assert/strict";
import { dataAgendamentoIsoSaoPaulo } from "../lib/agendamento-datetime";
import {
  computeESocialSummary,
  filterAgendamentosESocial,
  getDataReferenciaESocialIso,
  type ESocialFilters,
} from "../lib/esocial-filters";
import { mesReferenciaBRToYearMonth } from "../lib/listagem-meses";
import type { AgendamentoWithExames } from "../lib/types";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function mockAgendamento(
  partial: Partial<AgendamentoWithExames> & {
    data_agendamento: string;
  }
): AgendamentoWithExames {
  const { data_agendamento, ...rest } = partial;
  return {
    id: "ag-1",
    horario: "09:50",
    cliente_nome: "Cliente Teste",
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
    status: "agendado",
    created_at: "2026-07-31T19:51:00.000Z",
    esocial_entrada_em: "2026-07-31T19:51:00.000Z",
    agendamento_exames: [],
    ...rest,
    data_agendamento,
  };
}

function filtrarMes(
  agendamentos: AgendamentoWithExames[],
  mesReferencia: string,
  statusEsocial: ESocialFilters["statusEsocial"] = "todos"
) {
  return filterAgendamentosESocial(agendamentos, {
    cliente: "",
    colaborador: "",
    statusEsocial,
    mesReferencia,
    dataInicio: "",
    dataFim: "",
  });
}

run("criado 31/07, agendado 04/08 → aparece em Agosto", () => {
  const ag = mockAgendamento({
    data_agendamento: "2026-08-04",
    created_at: "2026-07-31T19:51:00.000Z",
    esocial_entrada_em: "2026-07-31T19:51:00.000Z",
  });

  assert.equal(getDataReferenciaESocialIso(ag), "2026-08-04");
  assert.equal(filtrarMes([ag], "08/2026").length, 1);
  assert.equal(filtrarMes([ag], "07/2026").length, 0);
});

run("criado 01/08, agendado 31/07 → aparece em Julho", () => {
  const ag = mockAgendamento({
    data_agendamento: "2026-07-31",
    created_at: "2026-08-01T12:00:00.000Z",
    esocial_entrada_em: "2026-08-01T12:00:00.000Z",
  });

  assert.equal(filtrarMes([ag], "07/2026").length, 1);
  assert.equal(filtrarMes([ag], "08/2026").length, 0);
});

run("agendado 31/07 → Julho", () => {
  const ag = mockAgendamento({ data_agendamento: "2026-07-31" });
  assert.equal(filtrarMes([ag], "07/2026").length, 1);
  assert.equal(filtrarMes([ag], "08/2026").length, 0);
});

run("agendado 01/08 → Agosto", () => {
  const ag = mockAgendamento({ data_agendamento: "2026-08-01" });
  assert.equal(filtrarMes([ag], "08/2026").length, 1);
  assert.equal(filtrarMes([ag], "07/2026").length, 0);
});

run("KPIs do mês usam a mesma regra da tabela", () => {
  const julho = mockAgendamento({
    id: "jul",
    data_agendamento: "2026-07-15",
    envio_esocial: false,
  });
  const agosto = mockAgendamento({
    id: "ago",
    data_agendamento: "2026-08-04",
    created_at: "2026-07-31T19:51:00.000Z",
    esocial_entrada_em: "2026-07-31T19:51:00.000Z",
    envio_esocial: true,
    data_envio_esocial: "2026-08-10",
  });

  const lista = filtrarMes([julho, agosto], "08/2026");
  const summary = computeESocialSummary(lista);

  assert.equal(lista.length, 1);
  assert.equal(lista[0].id, "ago");
  assert.equal(summary.total, 1);
  assert.equal(summary.enviados, 1);
});

run("enviados e pendentes usam a mesma data de referência", () => {
  const pendenteAgosto = mockAgendamento({
    id: "pend",
    data_agendamento: "2026-08-04",
    created_at: "2026-07-31T19:51:00.000Z",
    envio_esocial: false,
  });
  const enviadoAgosto = mockAgendamento({
    id: "env",
    data_agendamento: "2026-08-10",
    created_at: "2026-07-31T19:51:00.000Z",
    envio_esocial: true,
    data_envio_esocial: "2026-08-12",
  });
  const pendenteJulhoEntradaAgosto = mockAgendamento({
    id: "jul-exame",
    data_agendamento: "2026-07-20",
    created_at: "2026-08-05T10:00:00.000Z",
    envio_esocial: false,
  });

  const todos = [pendenteAgosto, enviadoAgosto, pendenteJulhoEntradaAgosto];
  const agostoPendentes = filtrarMes(todos, "08/2026", "pendente");
  const agostoEnviados = filtrarMes(todos, "08/2026", "enviado");

  assert.deepEqual(
    agostoPendentes.map((a) => a.id),
    ["pend"]
  );
  assert.deepEqual(
    agostoEnviados.map((a) => a.id),
    ["env"]
  );
});

run("trocar mês no filtro não considera created_at/esocial_entrada_em", () => {
  const ag = mockAgendamento({
    data_agendamento: "2026-08-04",
    created_at: "2026-07-31T19:51:00.000Z",
    esocial_entrada_em: "2026-07-31T19:51:00.000Z",
  });

  assert.equal(filtrarMes([ag], "07/2026").length, 0);
  assert.equal(filtrarMes([ag], "08/2026").length, 1);
});

run("ano vem da data do agendamento", () => {
  const ag2025 = mockAgendamento({
    id: "2025",
    data_agendamento: "2025-12-15",
    created_at: "2026-01-10T12:00:00.000Z",
  });
  const ag2026 = mockAgendamento({
    id: "2026",
    data_agendamento: "2026-01-05",
    created_at: "2025-12-20T12:00:00.000Z",
  });

  assert.deepEqual(filtrarMes([ag2025, ag2026], "12/2025").map((a) => a.id), [
    "2025",
  ]);
  assert.deepEqual(filtrarMes([ag2025, ag2026], "01/2026").map((a) => a.id), [
    "2026",
  ]);

  const ym = mesReferenciaBRToYearMonth("08/2026");
  assert.deepEqual(ym, { year: 2026, month: 8 });
});

run("timestamp próximo da meia-noite SP preserva dia civil correto", () => {
  // 2026-08-01 00:30 em SP = 2026-08-01T03:30:00.000Z
  assert.equal(
    dataAgendamentoIsoSaoPaulo("2026-08-01T03:30:00.000Z"),
    "2026-08-01"
  );
  // 2026-07-31 23:30 em SP = 2026-08-01T02:30:00.000Z → ainda julho em SP
  assert.equal(
    dataAgendamentoIsoSaoPaulo("2026-08-01T02:30:00.000Z"),
    "2026-07-31"
  );
  // Coluna date pura: sem conversão
  assert.equal(dataAgendamentoIsoSaoPaulo("2026-08-04"), "2026-08-04");
});

console.log("\nTodos os testes de filtro de período e-Social passaram.");
