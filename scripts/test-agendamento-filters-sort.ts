/** Testes de ordenação da lista filtrada de agendamentos. */

import {
  compareAgendamentosPorDataExameAsc,
  filterAgendamentos,
} from "../lib/agendamento-filters";
import { applyDefaultAgendamentoTableOrder } from "../lib/agendamento-table-sort";
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
  id: string,
  data: string,
  horario: string | null = "08:00"
): AgendamentoWithExames {
  return {
    id,
    data_agendamento: data,
    horario,
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
  };
}

const filtersAtivos = {
  mesReferencia: "06/2026",
  cliente: "",
  colaborador: "",
  clinica: "",
  tipoExame: "",
  aso: "",
  status: "agendado",
  responsavel: "",
  pendencia: "",
  pendenciaSituacao: "",
  esocial: "",
};

test("ordena por data do exame crescente", () => {
  const items = [
    agendamento("3", "2026-06-20"),
    agendamento("1", "2026-06-10"),
    agendamento("2", "2026-06-15"),
  ];
  const sorted = [...items].sort(compareAgendamentosPorDataExameAsc);
  assert(sorted.map((item) => item.id).join(",") === "1,2,3", "ordem incorreta");
});

test("com filtro ativo aplica ordem padrão da data mais antiga primeiro", () => {
  const items = [
    agendamento("3", "2026-06-20"),
    agendamento("1", "2026-06-10"),
    agendamento("2", "2026-06-15"),
  ];
  const filtered = filterAgendamentos(items, filtersAtivos);
  const result = applyDefaultAgendamentoTableOrder(filtered, filtersAtivos);
  assert(result[0].id === "1", "primeiro deveria ser o mais antigo");
  assert(result[2].id === "3", "último deveria ser o mais recente");
});

test("sem filtro ativo mantém ordem original", () => {
  const items = [
    agendamento("3", "2026-06-20"),
    agendamento("1", "2026-06-10"),
    agendamento("2", "2026-06-15"),
  ];
  const result = filterAgendamentos(items, {
    mesReferencia: "06/2026",
    cliente: "",
    colaborador: "",
    clinica: "",
    tipoExame: "",
    aso: "",
    status: "",
    responsavel: "",
    pendencia: "",
    pendenciaSituacao: "",
    esocial: "",
  });
  assert(result.map((item) => item.id).join(",") === "3,1,2", "ordem original");
});

test("filtra agendamentos pelo mês de referência", () => {
  const items = [
    agendamento("1", "2026-06-10"),
    agendamento("2", "2026-07-05"),
    agendamento("3", "2026-05-28"),
  ];
  const filtered = filterAgendamentos(items, {
    mesReferencia: "06/2026",
    cliente: "",
    colaborador: "",
    clinica: "",
    tipoExame: "",
    aso: "",
    status: "",
    responsavel: "",
    pendencia: "",
    pendenciaSituacao: "",
    esocial: "",
  });
  assert(filtered.length === 1 && filtered[0].id === "1", "somente junho");
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
