/** Smoke: permissão de encerrar contrato (somente admin). */

import assert from "node:assert/strict";
import {
  CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG,
  normalizePerfilUsuario,
  podeEncerrarContrato,
} from "../lib/contrato-permissoes";
import { resolveOrcamentoAcoesMenu } from "../lib/orcamento-acoes";

assert.equal(normalizePerfilUsuario("admin"), "admin");
assert.equal(normalizePerfilUsuario("ADM"), "admin");
assert.equal(normalizePerfilUsuario("Administrador"), "admin");
assert.equal(normalizePerfilUsuario("operacional"), "operacional");

assert.equal(podeEncerrarContrato("admin"), true);
assert.equal(podeEncerrarContrato("ADM"), true);
assert.equal(podeEncerrarContrato("Administrador"), true);
assert.equal(podeEncerrarContrato("operacional"), false);
assert.equal(podeEncerrarContrato(null), false);

assert.deepEqual(resolveOrcamentoAcoesMenu("enviado"), [
  "editar",
  "gerar_pdf",
  "aprovar",
  "cancelar",
]);
assert.deepEqual(
  resolveOrcamentoAcoesMenu("aprovado", { podeEncerrarContrato: false }),
  ["gerar_pdf"]
);
assert.deepEqual(
  resolveOrcamentoAcoesMenu("aprovado", { podeEncerrarContrato: true }),
  ["gerar_pdf", "cancelar"]
);

assert.ok(CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG.includes("administradores"));

console.log("test-contrato-encerrar-permissao: OK");
