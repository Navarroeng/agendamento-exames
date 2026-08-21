/** Testes do filtro Status em múltipla seleção (Agendamentos / histórico). */

import {
  EMPTY_AGENDAMENTO_FILTERS,
  filterAgendamentos,
  getDefaultAgendamentoFilters,
  hasActiveFilters,
  isAgendamentoStatusFiltroMarcado,
  isAgendamentoStatusFiltroTodos,
  labelAgendamentoStatusFiltro,
  matchesAgendamentoStatusFiltro,
  normalizeAgendamentoStatusFiltro,
  toggleAgendamentoStatusFiltro,
  type AgendamentoFilters,
  type AgendamentoStatusFiltro,
} from "../lib/agendamento-filters";
import type { AgendamentoStatus, AgendamentoWithExames } from "../lib/types";

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

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\n  esperado: ${JSON.stringify(expected)}\n  obtido: ${JSON.stringify(actual)}`
    );
  }
}

function filters(
  overrides: Partial<AgendamentoFilters> = {}
): AgendamentoFilters {
  return {
    ...EMPTY_AGENDAMENTO_FILTERS,
    mesReferencia: "08/2026",
    ...overrides,
  };
}

function agendamento(
  partial: Partial<AgendamentoWithExames> & {
    id: string;
    status: AgendamentoStatus;
  }
): AgendamentoWithExames {
  return {
    data_agendamento: "2026-08-10",
    horario: "08:00",
    cliente_nome: "CLUB COFFEE",
    colaborador: "Maria Silva",
    colaborador_cpf: "123.456.789-00",
    aso: "Admissional",
    clinica_nome: "Clínica Central",
    responsavel: "Bruna",
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
    ...partial,
  };
}

const base: AgendamentoWithExames[] = [
  agendamento({ id: "ag", status: "agendado" }),
  agendamento({ id: "ret", status: "aso_retido" }),
  agendamento({ id: "ras", status: "rascunho" }),
  agendamento({ id: "can", status: "cancelado" }),
];

function ids(
  items: AgendamentoWithExames[],
  selected: AgendamentoStatusFiltro[],
  extra: Partial<AgendamentoFilters> = {}
) {
  return filterAgendamentos(items, filters({ status: selected, ...extra }))
    .map((item) => item.id)
    .join(",");
}

function countLabel(total: number) {
  return `${total} agendamento${total !== 1 ? "s" : ""} encontrado${total !== 1 ? "s" : ""}`;
}

test("Todos inclui os quatro status", () => {
  assertEqual(ids(base, []), "ag,ret,ras,can", "Todos deveria listar todos");
  assert(isAgendamentoStatusFiltroTodos([]), "[] é Todos");
  assertEqual(labelAgendamentoStatusFiltro([]), "Todos", "rótulo Todos");
});

test("somente Agendado", () => {
  assertEqual(ids(base, ["agendado"]), "ag", "somente agendado");
  assertEqual(labelAgendamentoStatusFiltro(["agendado"]), "Agendado", "rótulo");
});

test("somente ASO Retido", () => {
  assertEqual(ids(base, ["aso_retido"]), "ret", "somente aso_retido");
  assertEqual(
    labelAgendamentoStatusFiltro(["aso_retido"]),
    "ASO Retido",
    "rótulo"
  );
});

test("Agendado + ASO Retido (OR)", () => {
  assertEqual(
    ids(base, ["agendado", "aso_retido"]),
    "ag,ret",
    "OR entre os dois"
  );
  assertEqual(
    labelAgendamentoStatusFiltro(["agendado", "aso_retido"]),
    "Agendado + 1",
    "rótulo compacto"
  );
});

test("Agendado + Rascunho (OR)", () => {
  assertEqual(ids(base, ["agendado", "rascunho"]), "ag,ras", "OR");
  assertEqual(
    labelAgendamentoStatusFiltro(["agendado", "rascunho"]),
    "Agendado + 1",
    "rótulo"
  );
});

test("três status: Agendado + ASO Retido + Rascunho", () => {
  assertEqual(
    ids(base, ["agendado", "aso_retido", "rascunho"]),
    "ag,ret,ras",
    "três status"
  );
  assertEqual(
    labelAgendamentoStatusFiltro(["agendado", "aso_retido", "rascunho"]),
    "Agendado + 2",
    "Agendado + 2"
  );
});

test("todos exceto Cancelado", () => {
  const next = toggleAgendamentoStatusFiltro([], "cancelado");
  assertEqual(
    next,
    ["agendado", "aso_retido", "rascunho"],
    "desmarcar Cancelado após Todos"
  );
  assert(!isAgendamentoStatusFiltroMarcado(next, "todos"), "Todos desmarcado");
  assert(isAgendamentoStatusFiltroMarcado(next, "agendado"), "Agendado");
  assert(!isAgendamentoStatusFiltroMarcado(next, "cancelado"), "Cancelado");
  assertEqual(ids(base, next), "ag,ret,ras", "sem cancelados");
});

test("somente Cancelado", () => {
  assertEqual(ids(base, ["cancelado"]), "can", "somente cancelado");
  assertEqual(labelAgendamentoStatusFiltro(["cancelado"]), "Cancelado", "rótulo");
});

test("marcar Todos restaura o atalho", () => {
  const partial = toggleAgendamentoStatusFiltro([], "cancelado");
  const todos = toggleAgendamentoStatusFiltro(partial, "todos");
  assertEqual(todos, [], "Todos = array vazio");
  assert(isAgendamentoStatusFiltroTodos(todos), "é Todos");
  assert(isAgendamentoStatusFiltroMarcado(todos, "agendado"), "individuais marcados");
  assert(isAgendamentoStatusFiltroMarcado(todos, "cancelado"), "Cancelado marcado");
  assertEqual(ids(base, todos), "ag,ret,ras,can", "mostra todos");
});

test("desmarcar um após Todos não deixa Todos + parcial", () => {
  const next = toggleAgendamentoStatusFiltro([], "rascunho");
  assert(!isAgendamentoStatusFiltroMarcado(next, "todos"), "Todos off");
  assert(isAgendamentoStatusFiltroMarcado(next, "agendado"), "agendado on");
  assert(!isAgendamentoStatusFiltroMarcado(next, "rascunho"), "rascunho off");
  assert(
    !(
      isAgendamentoStatusFiltroMarcado(next, "todos") &&
      !isAgendamentoStatusFiltroMarcado(next, "rascunho")
    ),
    "sem contradição Todos + desmarcado"
  );
});

test("voltar a selecionar todos normaliza para Todos", () => {
  let current: AgendamentoStatusFiltro[] = toggleAgendamentoStatusFiltro(
    [],
    "cancelado"
  );
  current = toggleAgendamentoStatusFiltro(current, "cancelado");
  assertEqual(current, [], "quatro individuais = Todos");
  assertEqual(
    normalizeAgendamentoStatusFiltro([
      "agendado",
      "aso_retido",
      "rascunho",
      "cancelado",
    ]),
    [],
    "normalize all → []"
  );
  assertEqual(labelAgendamentoStatusFiltro(current), "Todos", "rótulo Todos");
});

test("Status + Empresa", () => {
  const items = [
    agendamento({ id: "club-ag", status: "agendado", cliente_nome: "CLUB COFFEE" }),
    agendamento({
      id: "club-ret",
      status: "aso_retido",
      cliente_nome: "CLUB COFFEE",
    }),
    agendamento({
      id: "outra-ag",
      status: "agendado",
      cliente_nome: "Outra Empresa",
    }),
    agendamento({
      id: "club-ras",
      status: "rascunho",
      cliente_nome: "CLUB COFFEE",
    }),
  ];
  assertEqual(
    ids(items, ["agendado", "aso_retido"], { cliente: "CLUB COFFEE" }),
    "club-ag,club-ret",
    "empresa AND status OR"
  );
});

test("Status + Colaborador", () => {
  const items = [
    agendamento({ id: "maria-ag", status: "agendado", colaborador: "Maria Silva" }),
    agendamento({
      id: "maria-ras",
      status: "rascunho",
      colaborador: "Maria Silva",
    }),
    agendamento({ id: "joao-ag", status: "agendado", colaborador: "João Souza" }),
  ];
  assertEqual(
    ids(items, ["agendado", "rascunho"], { colaborador: "Maria" }),
    "maria-ag,maria-ras",
    "colaborador AND status OR"
  );
});

test("Status + Tipo de ASO", () => {
  const items = [
    agendamento({ id: "adm-ag", status: "agendado", aso: "Admissional" }),
    agendamento({ id: "adm-ret", status: "aso_retido", aso: "Admissional" }),
    agendamento({ id: "per-ag", status: "agendado", aso: "Periódico" }),
  ];
  assertEqual(
    ids(items, ["agendado", "aso_retido"], { aso: "Admissional" }),
    "adm-ag,adm-ret",
    "ASO AND status OR"
  );
});

test("Status + Pendência", () => {
  const items = [
    agendamento({
      id: "ag-pendente",
      status: "agendado",
      aso_enviado_clinica: false,
    }),
    agendamento({
      id: "ret-ok",
      status: "aso_retido",
      aso_enviado_clinica: true,
      data_aso_enviado_clinica: "2026-08-11",
    }),
    agendamento({
      id: "ras-pendente",
      status: "rascunho",
      aso_enviado_clinica: false,
    }),
  ];
  assertEqual(
    ids(items, ["agendado", "aso_retido"], {
      pendencia: "ASO Clínica",
      pendenciaSituacao: "pendente",
    }),
    "ag-pendente",
    "pendência AND status OR"
  );
});

test("Limpar filtros restaura Status Todos", () => {
  const cleared = {
    ...getDefaultAgendamentoFilters(),
    mesReferencia: "08/2026",
  };
  assert(isAgendamentoStatusFiltroTodos(cleared.status), "status Todos");
  assertEqual(cleared.status, [], "array vazio");
  assertEqual(labelAgendamentoStatusFiltro(cleared.status), "Todos", "rótulo");
});

test("contador X agendamentos encontrados", () => {
  const filtrados = filterAgendamentos(
    base,
    filters({ status: ["agendado", "aso_retido"] })
  );
  assertEqual(filtrados.length, 2, "dois resultados");
  assertEqual(countLabel(filtrados.length), "2 agendamentos encontrados", "plural");
  assertEqual(countLabel(1), "1 agendamento encontrado", "singular");
  assertEqual(countLabel(0), "0 agendamentos encontrados", "zero");
});

test("tabela: OR não exige todos os status no mesmo registro", () => {
  const filtrados = filterAgendamentos(
    base,
    filters({ status: ["agendado", "aso_retido"] })
  );
  assert(
    filtrados.every((item) =>
      matchesAgendamentoStatusFiltro(item.status, ["agendado", "aso_retido"])
    ),
    "cada linha tem um dos status"
  );
  assert(
    !filtrados.some((item) => item.status === "rascunho"),
    "sem rascunho"
  );
});

test("nenhum resultado", () => {
  const items = [agendamento({ id: "only-ag", status: "agendado" })];
  const filtrados = filterAgendamentos(
    items,
    filters({ status: ["cancelado"] })
  );
  assertEqual(filtrados.length, 0, "lista vazia");
  assertEqual(countLabel(0), "0 agendamentos encontrados", "contador zero");
});

test("hasActiveFilters: Todos não conta; subconjunto conta", () => {
  assert(!hasActiveFilters(filters({ mesReferencia: "08/2026" })), "só mês");
  assert(
    hasActiveFilters(filters({ mesReferencia: "08/2026", status: ["agendado"] })),
    "status específico é ativo"
  );
  assert(
    !hasActiveFilters(
      filters({
        mesReferencia: "08/2026",
        status: ["agendado", "aso_retido", "rascunho", "cancelado"],
      })
    ),
    "quatro status = Todos, não ativo"
  );
});

test("filtro não usa AND entre status", () => {
  const items = [agendamento({ id: "ag", status: "agendado" })];
  const filtrados = filterAgendamentos(
    items,
    filters({ status: ["agendado", "aso_retido"] })
  );
  assertEqual(filtrados.length, 1, "Agendado passa no OR mesmo sem ASO Retido");
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
