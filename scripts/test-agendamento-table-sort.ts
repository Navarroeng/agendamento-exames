/** Testes de ordenação da tabela de agendamentos. */

import {
  compareAgendamentosPorDataExameAsc,
  DEFAULT_AGENDAMENTO_STATUS_FILTRO,
  filterAgendamentos,
  hasActiveFilters,
  type AgendamentoFilters,
} from "../lib/agendamento-filters";
import {
  applyDefaultAgendamentoTableOrder,
  compareAgendamentosTableColumn,
  cycleAgendamentoTableSort,
  orderAgendamentosForTable,
  sortAgendamentosForTable,
} from "../lib/agendamento-table-sort";
import type { AgendamentoWithExames } from "../lib/types";

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

function agendamento(
  partial: Partial<AgendamentoWithExames> & Pick<AgendamentoWithExames, "id">
): AgendamentoWithExames {
  return {
    id: partial.id,
    data_agendamento: partial.data_agendamento ?? "2026-06-10",
    horario: partial.horario ?? "08:00",
    cliente_nome: partial.cliente_nome ?? "Cliente",
    colaborador: partial.colaborador ?? "Colaborador",
    colaborador_cpf: partial.colaborador_cpf ?? "123.456.789-00",
    aso: partial.aso ?? "Admissional",
    clinica_nome: partial.clinica_nome ?? "Clínica",
    responsavel: partial.responsavel ?? "Bruna",
    status: partial.status ?? "agendado",
    observacoes: null,
    aso_enviado_clinica: partial.aso_enviado_clinica ?? false,
    data_aso_enviado_clinica: null,
    aso_assinado: partial.aso_assinado ?? false,
    data_aso_assinado: null,
    aso_enviado_cliente: partial.aso_enviado_cliente ?? false,
    data_aso_enviado_cliente: null,
    envio_esocial: partial.envio_esocial ?? false,
    data_envio_esocial: null,
    esocial_recibo: null,
    numero_matricula: partial.numero_matricula ?? null,
    cargo_id: null,
    cargo_nome: null,
    agendamento_exames: partial.agendamento_exames ?? [],
  };
}

const emptyFilters: AgendamentoFilters = {
  mesReferencia: "06/2026",
  cliente: "",
  colaborador: "",
  clinica: "",
  tipoExame: "",
  aso: "",
  status: [...DEFAULT_AGENDAMENTO_STATUS_FILTRO],
  responsavel: "",
  pendencia: "",
  pendenciaSituacao: "",
  esocial: "",
};

const filtersAtivos: AgendamentoFilters = { ...emptyFilters, status: ["agendado"] };

test("ordena por data do exame crescente", () => {
  const items = [
    agendamento({ id: "3", data_agendamento: "2026-06-20" }),
    agendamento({ id: "1", data_agendamento: "2026-06-10" }),
    agendamento({ id: "2", data_agendamento: "2026-06-15" }),
  ];
  const sorted = [...items].sort(compareAgendamentosPorDataExameAsc);
  assert(sorted.map((item) => item.id).join(",") === "1,2,3", "ordem incorreta");
});

test("filtro não reordena — ordem padrão aplicada depois", () => {
  const items = [
    agendamento({ id: "3", data_agendamento: "2026-06-20" }),
    agendamento({ id: "1", data_agendamento: "2026-06-10" }),
    agendamento({ id: "2", data_agendamento: "2026-06-15" }),
  ];
  const filtered = filterAgendamentos(items, filtersAtivos);
  assert(filtered.map((item) => item.id).join(",") === "3,1,2", "filtro mantém ordem");

  const ordered = applyDefaultAgendamentoTableOrder(filtered, filtersAtivos);
  assert(ordered[0].id === "1", "padrão com filtro = data asc");
});

test("sem filtro ativo mantém ordem original no padrão", () => {
  const items = [
    agendamento({ id: "3", data_agendamento: "2026-06-20" }),
    agendamento({ id: "1", data_agendamento: "2026-06-10" }),
    agendamento({ id: "2", data_agendamento: "2026-06-15" }),
  ];
  const filtered = filterAgendamentos(items, emptyFilters);
  const ordered = applyDefaultAgendamentoTableOrder(filtered, emptyFilters);
  assert(ordered.map((item) => item.id).join(",") === "3,1,2", "ordem original");
  assert(!hasActiveFilters(emptyFilters), "sem filtros");
});

test("filtra agendamentos pelo mês de referência", () => {
  const items = [
    agendamento({ id: "1", data_agendamento: "2026-06-10" }),
    agendamento({ id: "2", data_agendamento: "2026-07-05" }),
    agendamento({ id: "3", data_agendamento: "2026-05-28" }),
  ];
  const filtered = filterAgendamentos(items, {
    ...emptyFilters,
    mesReferencia: "06/2026",
  });
  assert(filtered.map((item) => item.id).join(",") === "1", "somente junho");
});

test("cycle sort: asc → desc → null", () => {
  assert(cycleAgendamentoTableSort(null, "cliente")?.direction === "asc", "1º asc");
  assert(
    cycleAgendamentoTableSort({ column: "cliente", direction: "asc" }, "cliente")
      ?.direction === "desc",
    "2º desc"
  );
  assert(
    cycleAgendamentoTableSort({ column: "cliente", direction: "desc" }, "cliente") ===
      null,
    "3º null"
  );
});

test("ordena cliente alfabeticamente pt-BR", () => {
  const items = [
    agendamento({ id: "b", cliente_nome: "Mil Bolhas" }),
    agendamento({ id: "a", cliente_nome: "Empresa X" }),
  ];
  const sorted = sortAgendamentosForTable(items, {
    column: "cliente",
    direction: "asc",
  });
  assert(sorted.map((i) => i.id).join(",") === "a,b", "ordem alfabética");
});

test("ordena total cliente numericamente", () => {
  const items = [
    agendamento({
      id: "b",
      agendamento_exames: [
        {
          id: "e2",
          agendamento_id: "b",
          tipo_exame: "Clínico",
          valor_cliente: 200,
          custo_clinica: 0,
        },
      ],
    }),
    agendamento({
      id: "a",
      agendamento_exames: [
        {
          id: "e1",
          agendamento_id: "a",
          tipo_exame: "Clínico",
          valor_cliente: 50,
          custo_clinica: 0,
        },
      ],
    }),
  ];
  const sorted = sortAgendamentosForTable(items, {
    column: "totalCliente",
    direction: "asc",
  });
  assert(sorted[0].id === "a", "menor valor primeiro");
});

test("ordena booleanos (Não antes de Sim no asc)", () => {
  const items = [
    agendamento({ id: "sim", aso_enviado_clinica: true }),
    agendamento({ id: "nao", aso_enviado_clinica: false }),
  ];
  const sorted = sortAgendamentosForTable(items, {
    column: "asoClinica",
    direction: "asc",
  });
  assert(sorted[0].id === "nao", "false antes de true");
  assert(
    compareAgendamentosTableColumn(items[0], items[1], "asoClinica") > 0,
    "compare boolean"
  );
});

test("mantém ordenação customizada com filtros", () => {
  const items = [
    agendamento({ id: "1", cliente_nome: "Zeta", status: "agendado" }),
    agendamento({ id: "2", cliente_nome: "Alpha", status: "agendado" }),
  ];
  const filtered = filterAgendamentos(items, filtersAtivos);
  const ordered = orderAgendamentosForTable(filtered, filtersAtivos, {
    column: "cliente",
    direction: "desc",
  });
  assert(ordered.map((i) => i.id).join(",") === "1,2", "Z antes A no desc");
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
