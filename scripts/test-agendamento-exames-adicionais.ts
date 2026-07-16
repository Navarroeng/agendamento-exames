/** Testes do fluxo de exames adicionais no agendamento. */

import {
  exameJaNoAgendamento,
  filtrarExamesCatalogoPorBusca,
  listarExamesDisponiveisParaAdicionar,
  mensagemExameJaNoAgendamento,
  separarExamesCatalogoParaAdicionar,
} from "../lib/agendamento-exames-adicionais";
import type { ExameFormItem, ExameRecord } from "../lib/types";

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

const catalog: ExameRecord[] = [
  {
    id: "ecg-id",
    nome: "ECG",
    categoria: "Complementar",
    valor_navarro: 52,
    ativo: true,
    preparo: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "eeg-id",
    nome: "EEG",
    categoria: "Complementar",
    valor_navarro: 80,
    ativo: true,
    preparo: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "clinico-id",
    nome: "Clínico",
    categoria: "Ocupacional",
    valor_navarro: 50,
    ativo: true,
    preparo: null,
    created_at: "",
    updated_at: "",
  },
];

const examsCargo: ExameFormItem[] = [
  {
    id: "row-1",
    tipo_exame: "Clínico",
    exame_id: "clinico-id",
    valor_cliente: "100,00",
    custo_clinica: "0,01",
    lucro: "99,99",
    aviso: "",
    precoAutomatico: false,
    clinicoValorManual: false,
  },
  {
    id: "row-2",
    tipo_exame: "Audiometria",
    exame_id: "audio-id",
    valor_cliente: "30,00",
    custo_clinica: "20,00",
    lucro: "10,00",
    aviso: "",
    precoAutomatico: true,
    clinicoValorManual: false,
  },
];

test("mensagem de exame duplicado inclui o nome", () => {
  assert(
    mensagemExameJaNoAgendamento("ECG") ===
      "O exame ECG já faz parte deste agendamento.",
    "mensagem incorreta"
  );
});

test("identifica exame já presente por id ou nome", () => {
  assert(
    exameJaNoAgendamento(examsCargo, catalog[2]),
    "clínico já deveria estar no agendamento"
  );
  assert(
    !exameJaNoAgendamento(examsCargo, catalog[0]),
    "ECG ainda não deveria estar no agendamento"
  );
});

test("lista somente exames disponíveis para adicionar", () => {
  const disponiveis = listarExamesDisponiveisParaAdicionar(
    catalog,
    examsCargo
  );
  assert(disponiveis.length === 2, "deveria listar ECG e EEG");
  assert(
    disponiveis.every((exame) => exame.nome !== "Clínico"),
    "clínico não deveria aparecer"
  );
});

test("separa novos exames e duplicados na confirmação", () => {
  const selecionados = [catalog[0], catalog[2], catalog[1]];
  const { novos, duplicados } = separarExamesCatalogoParaAdicionar(
    selecionados,
    examsCargo
  );
  assert(novos.length === 2, "deveria aceitar ECG e EEG");
  assert(duplicados.length === 1, "deveria rejeitar Clínico");
  assert(duplicados[0].nome === "Clínico", "duplicado deveria ser Clínico");
});

test("pesquisa filtra por nome sem acento", () => {
  const filtrados = filtrarExamesCatalogoPorBusca(catalog, "ecg");
  assert(filtrados.length === 1, "deveria encontrar ECG");
  assert(filtrados[0].nome === "ECG", "resultado deveria ser ECG");
});

test("pesquisa filtra por categoria", () => {
  const filtrados = filtrarExamesCatalogoPorBusca(catalog, "ocupacional");
  assert(filtrados.length === 1, "deveria encontrar Clínico");
});

test("pesquisa vazia retorna catálogo completo", () => {
  assert(
    filtrarExamesCatalogoPorBusca(catalog, "").length === catalog.length,
    "sem busca deveria retornar todos"
  );
});

if (failed > 0) {
  process.exit(1);
}

console.log("\nTodos os testes passaram.");
