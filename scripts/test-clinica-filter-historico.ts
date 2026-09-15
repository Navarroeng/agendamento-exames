/** Testes do filtro Clínica em Agendamentos → Pesquisar histórico. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildClinicaFilterOptionsHistorico,
  filterClinicaFilterOptions,
  filterClinicasParaNovoAgendamento,
  isClinicaDisponivelNovoAgendamento,
} from "../lib/clinica-filters";
import {
  EMPTY_AGENDAMENTO_FILTERS,
  filterAgendamentos,
  getDefaultAgendamentoFilters,
  hasActiveFilters,
  type AgendamentoFilters,
} from "../lib/agendamento-filters";
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

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\n  esperado: ${JSON.stringify(expected)}\n  obtido: ${JSON.stringify(actual)}`
    );
  }
}

function clinica(
  nome: string,
  status: "ativa" | "inativa" = "ativa",
  razao = ""
) {
  return {
    nome_fantasia: nome,
    razao_social: razao,
    status,
  };
}

function labels(
  options: Array<{ value: string; label: string }>
): string[] {
  return options.map((item) => item.label);
}

function values(
  options: Array<{ value: string; label: string }>
): string[] {
  return options.map((item) => item.value);
}

function optionsForUser(
  _usuario: string,
  clinicas: Array<{
    nome_fantasia?: string | null;
    razao_social?: string | null;
    status?: string | null;
  }>,
  nomesExtras: Array<string | null | undefined>
) {
  return buildClinicaFilterOptionsHistorico(clinicas, nomesExtras);
}

function agendamento(
  partial: Partial<AgendamentoWithExames> & { id: string }
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
    ...partial,
  };
}

function filters(overrides: Partial<AgendamentoFilters> = {}): AgendamentoFilters {
  return {
    ...EMPTY_AGENDAMENTO_FILTERS,
    mesReferencia: "08/2026",
    ...overrides,
  };
}

const cadastro = [
  clinica("SPIX BARUERI"),
  clinica("SPIX PINHEIROS"),
  clinica("DOUTOR ASO"),
  clinica("ENGSEGTRA"),
  clinica("LABORMED MEDICINA DO TRABALHO"),
  clinica("LABORMESP IPIRANGA"),
  clinica("PREVINE SANTANA"),
  clinica("VITAE SANTA CRUZ - MEDICINA OCUPACIONAL"),
  clinica("CLÍNICA ANTIGA", "inativa"),
];

const recentes500 = [
  "SPIX BARUERI",
  "DOUTOR ASO",
  "Clínica Legada XYZ",
];

const historico = buildClinicaFilterOptionsHistorico(cadastro, recentes500);

test("CASO 1 — lista de clínicas não depende do usuário autenticado", () => {
  const bruna = optionsForUser("Bruna", cadastro, recentes500);
  const rafaela = optionsForUser("Rafaela", cadastro, recentes500);
  const karoline = optionsForUser("Karoline", cadastro, recentes500);
  assertEqual(bruna, rafaela, "Bruna e Rafaela devem receber a mesma lista");
  assertEqual(bruna, karoline, "Karoline deve receber a mesma lista");
  assert(
    !buildClinicaFilterOptionsHistorico.toString().includes("user"),
    "helper não recebe usuário autenticado"
  );
  assert(
    !buildClinicaFilterOptionsHistorico.toString().includes("responsavel"),
    "helper não filtra por responsável"
  );
});

test("CASO 2 — Bruna e Rafaela recebem as mesmas opções com o mesmo acesso ao módulo", () => {
  const bruna = optionsForUser("bruna@empresa", cadastro, recentes500);
  const rafaela = optionsForUser("rafaela@empresa", cadastro, recentes500);
  assertEqual(values(bruna), values(rafaela), "valores idênticos");
  assertEqual(labels(bruna), labels(rafaela), "rótulos idênticos");
});

test("CASO 3 — clínica cadastrada ausente dos 500 recentes continua no filtro", () => {
  assert(
    historico.some((item) => item.value === "PREVINE SANTANA"),
    "PREVINE SANTANA cadastrada deve aparecer"
  );
  assert(
    historico.some((item) => item.value === "LABORMESP IPIRANGA"),
    "LABORMESP IPIRANGA cadastrada deve aparecer"
  );
  assert(
    !recentes500.includes("PREVINE SANTANA"),
    "pré-condição: não está nos 500 recentes"
  );
});

test("CASO 4 — clínica inativa aparece no filtro de histórico", () => {
  assert(
    historico.some((item) => item.value === "CLÍNICA ANTIGA"),
    "inativa deve aparecer no histórico"
  );
});

test("CASO 5 — clínica inativa não entra no Novo Agendamento", () => {
  const paraFormulario = filterClinicasParaNovoAgendamento(cadastro);
  assert(
    paraFormulario.every((item) => item.status === "ativa"),
    "somente ativas"
  );
  assert(
    !paraFormulario.some((item) => item.nome_fantasia === "CLÍNICA ANTIGA"),
    "inativa não deve aparecer no formulário"
  );
  assert(
    !isClinicaDisponivelNovoAgendamento("inativa"),
    "status inativa bloqueado no novo agendamento"
  );
  assert(
    isClinicaDisponivelNovoAgendamento("ativa"),
    "status ativa permanece permitido"
  );
});

test("CASO 6 — clínica legada só em agendamentos aparece no filtro", () => {
  assert(
    historico.some((item) => item.value === "Clínica Legada XYZ"),
    "nome legado deve aparecer"
  );
});

test("CASO 7 — mesmo nome no cadastro e nos agendamentos aparece uma vez", () => {
  const duplicado = buildClinicaFilterOptionsHistorico(
    [clinica("SPIX BARUERI"), clinica("SPIX  BARUERI")],
    ["SPIX BARUERI", "spix barueri", " SPIX BARUERI "]
  );
  const spix = duplicado.filter(
    (item) => item.label.replace(/\s+/g, " ").toLowerCase() === "spix barueri"
  );
  assertEqual(spix.length, 1, "uma única opção SPIX BARUERI");
  assertEqual(spix[0].value, "SPIX BARUERI", "preserva o nome do cadastro");
});

test("CASO 8 — lista ordenada alfabeticamente", () => {
  const ordenado = [...labels(historico)].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  assertEqual(labels(historico), ordenado, "ordem A→Z pt-BR");
});

test("CASO 9 — digitar parte do nome filtra as opções", () => {
  const filtrado = filterClinicaFilterOptions(historico, "spix");
  assertEqual(
    labels(filtrado),
    ["SPIX BARUERI", "SPIX PINHEIROS"],
    "busca spix"
  );
  const vazio = filterClinicaFilterOptions(historico, "zzzz-inexistente");
  assertEqual(vazio.length, 0, "sem correspondência");
  const completo = filterClinicaFilterOptions(historico, "   ");
  assertEqual(completo.length, historico.length, "query vazia mostra todas");
});

test("CASO 10 — selecionar clínica filtra os agendamentos", () => {
  const items = [
    agendamento({ id: "1", clinica_nome: "SPIX BARUERI" }),
    agendamento({ id: "2", clinica_nome: "SPIX PINHEIROS" }),
    agendamento({ id: "3", clinica_nome: "DOUTOR ASO" }),
  ];
  const filtrados = filterAgendamentos(
    items,
    filters({ clinica: "SPIX BARUERI", status: [] })
  );
  assertEqual(
    filtrados.map((item) => item.id),
    ["1"],
    "somente a clínica selecionada"
  );
});

test("CASO 11 — Limpar filtros remove a clínica selecionada", () => {
  const selecionado = {
    ...getDefaultAgendamentoFilters(),
    clinica: "SPIX BARUERI",
  };
  assert(hasActiveFilters(selecionado), "clínica selecionada conta como filtro ativo");
  const limpo = getDefaultAgendamentoFilters();
  assertEqual(limpo.clinica, "", "clínica volta a vazio");
  assert(!hasActiveFilters(limpo), "após limpar, nenhum filtro extra permanece");
});

test("CASO 12 — demais filtros continuam funcionando", () => {
  const items = [
    agendamento({
      id: "1",
      clinica_nome: "SPIX BARUERI",
      colaborador: "Ana",
      aso: "Admissional",
      cliente_nome: "EMPRESA A",
      responsavel: "Bruna",
      status: "agendado",
      agendamento_exames: [
        {
          id: "ex-1",
          agendamento_id: "1",
          tipo_exame: "Clínico",
          valor_cliente: 0,
          custo_clinica: 0,
        },
      ],
    }),
    agendamento({
      id: "2",
      clinica_nome: "DOUTOR ASO",
      colaborador: "Bruno",
      aso: "Demissional",
      cliente_nome: "EMPRESA B",
      responsavel: "Rafaela",
      status: "rascunho",
      agendamento_exames: [
        {
          id: "ex-2",
          agendamento_id: "2",
          tipo_exame: "Audiometria",
          valor_cliente: 0,
          custo_clinica: 0,
        },
      ],
    }),
  ];

  assertEqual(
    filterAgendamentos(items, filters({ colaborador: "Ana", status: [] })).map((i) => i.id),
    ["1"],
    "filtro colaborador"
  );
  assertEqual(
    filterAgendamentos(items, filters({ cliente: "EMPRESA B", status: [] })).map((i) => i.id),
    ["2"],
    "filtro empresa"
  );
  assertEqual(
    filterAgendamentos(items, filters({ aso: "Demissional", status: [] })).map((i) => i.id),
    ["2"],
    "filtro tipo de ASO"
  );
  assertEqual(
    filterAgendamentos(items, filters({ tipoExame: "Audiometria", status: [] })).map((i) => i.id),
    ["2"],
    "filtro tipo de exame"
  );
  assertEqual(
    filterAgendamentos(items, filters({ responsavel: "Rafaela", status: [] })).map((i) => i.id),
    ["2"],
    "filtro responsável"
  );
  assertEqual(
    filterAgendamentos(items, filters({ status: ["rascunho"] })).map((i) => i.id),
    ["2"],
    "filtro status"
  );
});

test("UI do histórico usa combobox controlado, sem datalist nativo", () => {
  const root = join(__dirname, "..");
  const filtersUi = readFileSync(
    join(root, "components/agendamentos/AgendamentosFilters.tsx"),
    "utf8"
  );
  const searchable = readFileSync(
    join(root, "components/ui/SearchableSelect.tsx"),
    "utf8"
  );
  const pageHook = readFileSync(
    join(root, "hooks/useAgendamentosPage.ts"),
    "utf8"
  );
  const form = readFileSync(
    join(root, "components/agendamentos/AgendamentoForm.tsx"),
    "utf8"
  );
  const page = readFileSync(
    join(root, "components/agendamentos/AgendamentoPage.tsx"),
    "utf8"
  );
  const agendamentoService = readFileSync(
    join(root, "services/agendamento.service.ts"),
    "utf8"
  );

  assert(filtersUi.includes("SearchableSelect"), "filtro Clínica usa SearchableSelect");
  assert(!filtersUi.includes('list="filtro-clinicas"'), "não usa input list nativo");
  assert(!filtersUi.includes('id="filtro-clinicas"'), "não usa datalist de clínicas");
  assert(searchable.includes('autoComplete="off"'), "busca sem autocomplete do Chrome");
  assert(!searchable.includes("<datalist"), "SearchableSelect sem datalist");
  assert(
    pageHook.includes("buildClinicaFilterOptionsHistorico"),
    "histórico monta opções pelo cadastro + legado"
  );
  assert(
    pageHook.includes("filterClinicasParaNovoAgendamento"),
    "Novo Agendamento segue filtrando clínicas ativas"
  );
  assert(
    page.includes("clinicas={clinicasAtivas}"),
    "formulário recebe somente clínicas ativas"
  );
  assert(
    form.includes("clinicas.map"),
    "Novo Agendamento continua listando as clínicas recebidas"
  );
  assert(
    !form.includes("status === \"inativa\""),
    "formulário não passou a incluir inativas"
  );
  assert(
    /listarAgendamentosComExames\s*=\s*500|limit\s*=\s*500/.test(agendamentoService) ||
      agendamentoService.includes("listarAgendamentosComExames(limit = 500)"),
    "limit 500 do histórico permanece"
  );
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
