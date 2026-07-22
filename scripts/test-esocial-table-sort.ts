/** Testes de ordenação da tabela e-Social. */

import {
  EMPTY_ESOCIAL_FILTERS,
  ESOCIAL_PAGE_SIZE,
  filterAgendamentosESocial,
} from "../lib/esocial-filters";
import {
  compareAgendamentosESocialDefault,
  cycleESocialTableSort,
  orderESocialForTable,
  sortESocialForTable,
} from "../lib/esocial-table-sort";
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
    data_envio_esocial: partial.data_envio_esocial ?? null,
    esocial_recibo: null,
    numero_matricula: partial.numero_matricula ?? null,
    cargo_id: null,
    cargo_nome: null,
    agendamento_exames: partial.agendamento_exames ?? [],
  };
}

test("ordem padrão: data do exame crescente + horário", () => {
  const items = [
    agendamento({ id: "3", data_agendamento: "2026-06-20", horario: "10:00" }),
    agendamento({ id: "1", data_agendamento: "2026-06-10", horario: "08:00" }),
    agendamento({ id: "2", data_agendamento: "2026-06-10", horario: "14:00" }),
  ];
  const ordered = orderESocialForTable(items, null);
  assert(ordered.map((i) => i.id).join(",") === "1,2,3", "ordem padrão incorreta");
});

test("cycle sort: asc → desc → null", () => {
  assert(cycleESocialTableSort(null, "cliente")?.direction === "asc", "1º asc");
  assert(
    cycleESocialTableSort({ column: "cliente", direction: "asc" }, "cliente")
      ?.direction === "desc",
    "2º desc"
  );
  assert(
    cycleESocialTableSort({ column: "cliente", direction: "desc" }, "cliente") ===
      null,
    "3º null"
  );
});

test("ordena empresa alfabeticamente A→Z", () => {
  const items = [
    agendamento({ id: "b", cliente_nome: "Mil Bolhas" }),
    agendamento({ id: "a", cliente_nome: "Aluminio Firenze" }),
    agendamento({ id: "c", cliente_nome: "Pavfacil" }),
  ];
  const sorted = sortESocialForTable(items, {
    column: "cliente",
    direction: "asc",
  });
  assert(sorted.map((i) => i.id).join(",") === "a,b,c", "ordem alfabética asc");
});

test("ordena empresa Z→A", () => {
  const items = [
    agendamento({ id: "b", cliente_nome: "Mil Bolhas" }),
    agendamento({ id: "a", cliente_nome: "Aluminio Firenze" }),
  ];
  const sorted = sortESocialForTable(items, {
    column: "cliente",
    direction: "desc",
  });
  assert(sorted.map((i) => i.id).join(",") === "b,a", "ordem alfabética desc");
});

test("ordena colaborador A→Z", () => {
  const items = [
    agendamento({ id: "b", colaborador: "Zélia" }),
    agendamento({ id: "a", colaborador: "Ana" }),
  ];
  const sorted = sortESocialForTable(items, {
    column: "colaborador",
    direction: "asc",
  });
  assert(sorted[0].id === "a", "colaborador asc");
});

test("ordena data do exame decrescente", () => {
  const items = [
    agendamento({ id: "1", data_agendamento: "2026-06-10" }),
    agendamento({ id: "2", data_agendamento: "2026-06-20" }),
  ];
  const sorted = sortESocialForTable(items, {
    column: "dataExame",
    direction: "desc",
  });
  assert(sorted.map((i) => i.id).join(",") === "2,1", "data desc");
});

test("ordena tipo de ASO", () => {
  const items = [
    agendamento({ id: "b", aso: "Periódico" }),
    agendamento({ id: "a", aso: "Admissional" }),
  ];
  const sorted = sortESocialForTable(items, {
    column: "aso",
    direction: "asc",
  });
  assert(sorted[0].id === "a", "aso asc");
});

test("filtro não reordena — ordenação aplicada depois", () => {
  const items = [
    agendamento({ id: "3", data_agendamento: "2026-06-20", cliente_nome: "Zeta" }),
    agendamento({ id: "1", data_agendamento: "2026-06-10", cliente_nome: "Alpha" }),
    agendamento({ id: "2", data_agendamento: "2026-06-15", cliente_nome: "Beta" }),
  ];
  const filtered = filterAgendamentosESocial(items, {
    ...EMPTY_ESOCIAL_FILTERS,
    mesReferencia: "06/2026",
  });
  assert(filtered.map((i) => i.id).join(",") === "3,1,2", "filtro mantém ordem original");

  const ordered = orderESocialForTable(filtered, {
    column: "cliente",
    direction: "asc",
  });
  assert(ordered.map((i) => i.id).join(",") === "1,2,3", "ordena após filtro");
});

test("paginação usa lista completa ordenada", () => {
  const items = Array.from({ length: 35 }, (_, i) =>
    agendamento({
      id: String(i + 1),
      data_agendamento: `2026-06-${String(i + 1).padStart(2, "0")}`,
    })
  );
  const ordered = orderESocialForTable(items, null);
  const page1 = ordered.slice(0, ESOCIAL_PAGE_SIZE);
  const page2 = ordered.slice(ESOCIAL_PAGE_SIZE, ESOCIAL_PAGE_SIZE * 2);

  assert(page1.length === ESOCIAL_PAGE_SIZE, "página 1 cheia");
  assert(page2.length === 5, "página 2 com restante");
  assert(page1[0].id === "1", "primeiro item global na página 1");
  assert(page2[0].id === "31", "primeiro item da página 2");
  assert(
    compareAgendamentosESocialDefault(page1[0], page1[1]) <= 0,
    "página 1 ordenada"
  );
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
