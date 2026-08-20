/** Prefill de Novo Agendamento: cliente/cargo e espera da lista. */

import assert from "node:assert/strict";
import {
  parseAgendamentoPrefillFromSearchParams,
  resolveClienteIdFromPrefill,
  shouldDeferAgendamentoPrefillApply,
} from "../lib/agendamento-prefill";
import { resolveCargoIdFromPrefill } from "../lib/agendamento-cargo";

const clientes = [
  {
    id: "cli-anto",
    nome: "ANTÔ CAFE E BAR LTDA",
    cnpj: "12.345.678/0001-90",
  },
  {
    id: "cli-outro",
    nome: "OUTRA EMPRESA",
    cnpj: "98.765.432/0001-10",
  },
];

const cargos = [
  { id: "cargo-coz", nome: "Cozinheiro" },
  { id: "cargo-aux", nome: "Auxiliar" },
];

assert.equal(
  shouldDeferAgendamentoPrefillApply({
    clientesLoading: true,
    cargosLoading: false,
    cargoId: "cargo-coz",
    cargoNome: "Cozinheiro",
  }),
  true,
  "espera a lista de clientes"
);

assert.equal(
  shouldDeferAgendamentoPrefillApply({
    clientesLoading: false,
    cargosLoading: true,
    cargoId: "cargo-coz",
    cargoNome: "Cozinheiro",
  }),
  false,
  "com cargo_id não precisa esperar o catálogo"
);

assert.equal(
  shouldDeferAgendamentoPrefillApply({
    clientesLoading: false,
    cargosLoading: true,
    cargoId: "",
    cargoNome: "Cozinheiro",
  }),
  true,
  "sem cargo_id, espera o catálogo para casar o nome"
);

assert.equal(
  shouldDeferAgendamentoPrefillApply({
    clientesLoading: false,
    cargosLoading: false,
    cargoId: "",
    cargoNome: "Cozinheiro",
  }),
  false
);

assert.equal(
  resolveClienteIdFromPrefill(clientes, {
    cliente_id: "cli-anto",
    cliente_nome: "nome diferente",
  }),
  "cli-anto",
  "prioriza cliente_id"
);

assert.equal(
  resolveClienteIdFromPrefill(clientes, {
    cliente_nome: "Nome errado",
    cliente_cnpj: "12345678000190",
  }),
  "cli-anto",
  "resolve por CNPJ quando o nome diverge"
);

assert.equal(
  resolveClienteIdFromPrefill(clientes, {
    cliente_nome: "antô cafe e bar ltda",
  }),
  "cli-anto",
  "resolve por nome"
);

assert.equal(
  resolveClienteIdFromPrefill([], {
    cliente_id: "cli-anto",
    cliente_nome: "ANTÔ CAFE E BAR LTDA",
  }),
  "",
  "lista vazia não seleciona"
);

assert.equal(
  resolveCargoIdFromPrefill(cargos, {
    cargo_id: "cargo-coz",
    cargo_nome: "Outro",
  }),
  "cargo-coz"
);

assert.equal(
  resolveCargoIdFromPrefill(cargos, { cargo_nome: "cozinheiro" }),
  "cargo-coz",
  "casa cargo pelo nome ignorando caixa"
);

assert.equal(
  resolveCargoIdFromPrefill(cargos, { cargo_id: "cargo-inativo" }),
  "cargo-inativo",
  "mantém cargo_id mesmo fora do catálogo ativo"
);

assert.equal(
  resolveCargoIdFromPrefill(cargos, { cargo_nome: "Inexistente" }),
  "",
  "não inventa cargo"
);

const fromUrl = parseAgendamentoPrefillFromSearchParams(
  new URLSearchParams({
    prefill: "1",
    empresa: "ANTÔ CAFE E BAR LTDA",
    colaborador: "NATÁLIA PORFÍRIO BATISTA",
    cpf: "443.654.168-12",
    cargo: "Cozinheiro",
    cargo_id: "cargo-coz",
    cliente_id: "cli-anto",
    cnpj: "12.345.678/0001-90",
    vaga_id: "vaga-1",
    contrato_id: "ctr-1",
  })
);

assert.ok(fromUrl);
assert.equal(fromUrl?.cliente_id, "cli-anto");
assert.equal(fromUrl?.cargo_id, "cargo-coz");
assert.equal(fromUrl?.vaga_id, "vaga-1");

console.log("test-agendamento-prefill: OK");
