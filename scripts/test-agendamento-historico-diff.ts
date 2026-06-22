/** Testes de normalização no diff de histórico/auditoria de agendamentos. */

import { buildHistoricoAlteracoes } from "../lib/agendamento-historico-diff";
import type { AgendamentoInsert, AgendamentoWithExames } from "../lib/types";

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

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function baseAnterior(
  overrides: Partial<AgendamentoWithExames> = {}
): AgendamentoWithExames {
  return {
    id: "ag-1",
    data_agendamento: "2026-06-16",
    horario: "08:00:00",
    cliente_nome: "EMPRESA TESTE",
    colaborador: "JOAO SILVA",
    colaborador_cpf: "123.456.789-00",
    aso: "Admissional",
    clinica_nome: "CLINICA TESTE",
    responsavel: "Maria",
    observacoes: null,
    status: "agendado",
    numero_matricula: null,
    aso_enviado_clinica: false,
    data_aso_enviado_clinica: null,
    aso_assinado: false,
    data_aso_assinado: null,
    aso_enviado_cliente: false,
    data_aso_enviado_cliente: null,
    envio_esocial: false,
    data_envio_esocial: null,
    esocial_recibo: null,
    cargo_id: "cargo-1",
    cargo_nome: "OPERADOR",
    agendamento_exames: [],
    ...overrides,
  };
}

function baseNovo(overrides: Partial<AgendamentoInsert> = {}): AgendamentoInsert {
  return {
    data_agendamento: "2026-06-16",
    horario: "08:00",
    cliente_nome: "EMPRESA TESTE",
    colaborador: "JOAO SILVA",
    colaborador_cpf: "123.456.789-00",
    aso: "Admissional",
    clinica_nome: "CLINICA TESTE",
    responsavel: "Maria",
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
    cargo_id: "cargo-1",
    cargo_nome: "OPERADOR",
    status: "agendado",
    ...overrides,
  };
}

function hasHorarioChange(changes: { detalhes: string }[]): boolean {
  return changes.some((entry) => entry.detalhes.includes("o horário"));
}

test("não registra alteração de horário quando 08:00:00 e 08:00 são equivalentes", () => {
  const changes = buildHistoricoAlteracoes(
    baseAnterior(),
    baseNovo(),
    [],
    "Admin"
  );
  assert(!hasHorarioChange(changes), `esperado sem horário, recebeu: ${JSON.stringify(changes)}`);
});

test("não registra horário ao alterar apenas o responsável", () => {
  const changes = buildHistoricoAlteracoes(
    baseAnterior(),
    baseNovo({ responsavel: "Ana" }),
    [],
    "Admin"
  );
  assert(!hasHorarioChange(changes), `esperado sem horário, recebeu: ${JSON.stringify(changes)}`);
  assert(
    changes.some((entry) => entry.detalhes.includes("o responsável")),
    "esperado alteração de responsável"
  );
});

test("registra alteração de horário de 08:00 para 09:00", () => {
  const changes = buildHistoricoAlteracoes(
    baseAnterior(),
    baseNovo({ horario: "09:00" }),
    [],
    "Admin"
  );
  assert(
    changes.some((entry) =>
      entry.detalhes.includes("alterou o horário de 08:00 para 09:00")
    ),
    `esperado mensagem de horário, recebeu: ${JSON.stringify(changes)}`
  );
});

test("não registra alteração de CPF com mesma máscara", () => {
  const changes = buildHistoricoAlteracoes(
    baseAnterior({ colaborador_cpf: "12345678900" }),
    baseNovo({ colaborador_cpf: "123.456.789-00" }),
    [],
    "Admin"
  );
  assert(
    !changes.some((entry) => entry.detalhes.includes("CPF")),
    `esperado sem CPF, recebeu: ${JSON.stringify(changes)}`
  );
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
