import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  podeAbrirClienteDaImplantacao,
  secaoInicialAoAbrirCliente,
} from "../lib/abrir-cliente-implantacao";

assert.equal(secaoInicialAoAbrirCliente("funcionarios"), "colaboradores");
assert.equal(secaoInicialAoAbrirCliente("resumo"), null);
assert.equal(secaoInicialAoAbrirCliente("contrato"), null);
assert.equal(secaoInicialAoAbrirCliente("financeiro"), null);

assert.equal(
  podeAbrirClienteDaImplantacao({
    contextoImplantacao: true,
    clienteId: "11111111-1111-4111-8111-111111111111",
    perfil: "operacional",
  }),
  true
);
assert.equal(
  podeAbrirClienteDaImplantacao({
    contextoImplantacao: true,
    clienteId: "11111111-1111-4111-8111-111111111111",
    perfil: "admin",
  }),
  true
);
assert.equal(
  podeAbrirClienteDaImplantacao({
    contextoImplantacao: true,
    clienteId: "  ",
    perfil: "admin",
  }),
  false
);
assert.equal(
  podeAbrirClienteDaImplantacao({
    contextoImplantacao: false,
    clienteId: "11111111-1111-4111-8111-111111111111",
    perfil: "admin",
  }),
  false
);

const modal = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAprovarModal.tsx"),
  "utf8"
);
assert.match(modal, /Abrir Cliente/);
assert.match(modal, /buscarClientePorId\(clienteId\)/);
assert.match(modal, /secaoInicialAoAbrirCliente\(tab\)/);
assert.doesNotMatch(modal, /buscarClientePorId\(\s*orcamento\.cliente_nome/);

const lista = readFileSync(
  join(process.cwd(), "components/orcamentos/OrcamentoAbaFuncionarios.tsx"),
  "utf8"
);
assert.match(lista, /\/colaboradores`,\s*\{\s*cache:\s*"no-store"\s*\}/);

console.log("test-abrir-cliente-implantacao: ok");
