/** Smoke: alteração de responsável do processo. */

import assert from "node:assert/strict";
import {
  ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG,
  formatCriadoPorOrcamento,
  podeAlterarResponsavelProcesso,
  statusPermiteAlterarResponsavel,
} from "../lib/orcamento-responsavel";
import { resolveOrcamentoAcoesMenu } from "../lib/orcamento-acoes";

assert.equal(statusPermiteAlterarResponsavel("aprovado"), true);
assert.equal(statusPermiteAlterarResponsavel("em_elaboracao"), true);
assert.equal(statusPermiteAlterarResponsavel("cancelado"), false);
assert.equal(statusPermiteAlterarResponsavel("contrato_encerrado"), false);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "admin",
    usuarioId: "u1",
    usuarioNome: "Admin",
    orcamento: {
      status: "aprovado",
      responsavel: "Bruna",
      responsavel_user_id: "u2",
    },
  }),
  true
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u2",
    usuarioNome: "Bruna",
    orcamento: {
      status: "aprovado",
      responsavel: "Bruna",
      responsavel_user_id: "u2",
    },
  }),
  true
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u3",
    usuarioNome: "Rafaela",
    orcamento: {
      status: "aprovado",
      responsavel: "Bruna",
      responsavel_user_id: "u2",
    },
  }),
  false
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "admin",
    usuarioId: "u1",
    usuarioNome: "Admin",
    orcamento: {
      status: "cancelado",
      responsavel: "Bruna",
      responsavel_user_id: "u2",
    },
  }),
  false
);

assert.equal(
  formatCriadoPorOrcamento({
    criado_por: "Bruna",
    responsavel: "Rafaela",
  }),
  "Bruna"
);

assert.ok(
  resolveOrcamentoAcoesMenu("aprovado", {
    podeAlterarResponsavel: true,
    podeEncerrarContrato: false,
  }).includes("alterar_responsavel")
);
assert.ok(
  !resolveOrcamentoAcoesMenu("aprovado", {
    podeAlterarResponsavel: false,
  }).includes("alterar_responsavel")
);
assert.ok(
  !resolveOrcamentoAcoesMenu("cancelado", {
    podeAlterarResponsavel: true,
  }).includes("alterar_responsavel")
);

assert.ok(ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG.includes("cancelado"));

console.log("test-orcamento-alterar-responsavel: OK");
