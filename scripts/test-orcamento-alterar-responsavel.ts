/** Permissão de alterar responsável pelo processo (Orçamentos). */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RESPONSAVEIS } from "../lib/constants";
import {
  ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG,
  ORCAMENTO_RESPONSAVEL_SEM_PERMISSAO_MSG,
  formatCriadoPorOrcamento,
  isGrupoOperacionalAlterarResponsavel,
  podeAlterarResponsavelProcesso,
  statusPermiteAlterarResponsavel,
} from "../lib/orcamento-responsavel";
import { resolveOrcamentoAcoesMenu } from "../lib/orcamento-acoes";

const root = join(__dirname, "..");

const orcamentoBruna = {
  status: "aprovado" as const,
  responsavel: "Bruna",
  responsavel_user_id: "u-bruna",
};
const orcamentoRafaela = {
  status: "em_elaboracao" as const,
  responsavel: "Rafaela",
  responsavel_user_id: "u-rafaela",
};
const orcamentoAdmin = {
  status: "enviado" as const,
  responsavel: "Admin",
  responsavel_user_id: "u-admin",
};

assert.equal(statusPermiteAlterarResponsavel("aprovado"), true);
assert.equal(statusPermiteAlterarResponsavel("em_elaboracao"), true);
assert.equal(statusPermiteAlterarResponsavel("cancelado"), false);
assert.equal(statusPermiteAlterarResponsavel("contrato_encerrado"), false);

assert.deepEqual([...RESPONSAVEIS], ["Bruna", "Rafaela", "Karoline"]);

assert.equal(isGrupoOperacionalAlterarResponsavel("admin", "Qualquer"), true);
assert.equal(
  isGrupoOperacionalAlterarResponsavel("operacional", "Bruna"),
  true
);
assert.equal(
  isGrupoOperacionalAlterarResponsavel("operacional", "Rafaela"),
  true
);
assert.equal(
  isGrupoOperacionalAlterarResponsavel("operacional", "Karoline"),
  true
);
assert.equal(
  isGrupoOperacionalAlterarResponsavel("operacional", "João"),
  false
);
assert.equal(
  isGrupoOperacionalAlterarResponsavel("cliente", "Rafaela"),
  false
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "admin",
    usuarioId: "u1",
    usuarioNome: "Admin",
    orcamento: orcamentoBruna,
  }),
  true,
  "CASO 1 — Admin altera mesmo não sendo o responsável atual"
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u-bruna",
    usuarioNome: "Bruna",
    orcamento: orcamentoBruna,
  }),
  true,
  "CASO 2 — Bruna altera"
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u-rafaela",
    usuarioNome: "Rafaela",
    orcamento: orcamentoBruna,
  }),
  true,
  "CASO 3 — Rafaela altera orçamento da Bruna"
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u-karoline",
    usuarioNome: "Karoline",
    orcamento: orcamentoAdmin,
  }),
  true,
  "CASO 4 — Karoline altera orçamento do Admin"
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u-joao",
    usuarioNome: "João",
    orcamento: orcamentoBruna,
  }),
  false,
  "CASO 5 — outro operacional não altera"
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u-rafaela",
    usuarioNome: "Rafaela",
    orcamento: orcamentoBruna,
  }),
  true,
  "CASO 6 — Rafaela pode transferir BRUNA → RAFAELA"
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u-bruna",
    usuarioNome: "Bruna",
    orcamento: orcamentoRafaela,
  }),
  true,
  "CASO 7 — Bruna pode transferir RAFAELA → KAROLINE"
);

assert.equal(
  podeAlterarResponsavelProcesso({
    perfil: "operacional",
    usuarioId: "u-outro",
    usuarioNome: "Karoline",
    orcamento: orcamentoBruna,
  }),
  true,
  "CASO 8 — autorizada altera mesmo não sendo a responsável atual"
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
  "BRUNA"
);

function menuMostraAlterar(
  status: Parameters<typeof resolveOrcamentoAcoesMenu>[0],
  podeAlterar: boolean
) {
  return resolveOrcamentoAcoesMenu(status, {
    podeAlterarResponsavel: podeAlterar,
    podeEncerrarContrato: false,
  }).includes("alterar_responsavel");
}

assert.equal(menuMostraAlterar("aprovado", true), true);
assert.equal(menuMostraAlterar("aprovado", false), false);
assert.equal(menuMostraAlterar("em_elaboracao", true), true);
assert.equal(menuMostraAlterar("cancelado", true), false);

assert.ok(
  resolveOrcamentoAcoesMenu("enviado", {
    podeAlterarResponsavel: true,
  }).includes("editar"),
  "alterar responsável não remove Editar"
);
assert.ok(
  resolveOrcamentoAcoesMenu("enviado", {
    podeAlterarResponsavel: true,
  }).includes("aprovar"),
  "alterar responsável não remove Aprovar"
);

assert.ok(ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG.includes("cancelado"));
assert.match(
  ORCAMENTO_RESPONSAVEL_SEM_PERMISSAO_MSG,
  /não possui permissão/
);

const helperSrc = readFileSync(
  join(root, "lib/orcamento-responsavel.ts"),
  "utf8"
);
assert.match(helperSrc, /RESPONSAVEIS/);
assert.match(helperSrc, /isPerfilStaffNavarro/);
assert.doesNotMatch(
  helperSrc,
  /responsavelUserId === params\.usuarioId/
);
assert.doesNotMatch(
  helperSrc,
  /params\.orcamento\.responsavel\) ===\s*normalizeNome\(params\.usuarioNome\)/
);

const menuSrc = readFileSync(
  join(root, "components/orcamentos/OrcamentoRowActionsMenu.tsx"),
  "utf8"
);
assert.match(menuSrc, /Alterar responsável pelo processo/);
assert.match(menuSrc, /podeAlterarResponsavel/);
assert.match(menuSrc, /resolveOrcamentoAcoesMenu/);

const tableSrc = readFileSync(
  join(root, "components/orcamentos/OrcamentosTable.tsx"),
  "utf8"
);
assert.match(tableSrc, /resolvePodeAlterarResponsavel\?\.\(orcamento\)/);

const hookSrc = readFileSync(
  join(root, "hooks/useOrcamentosPage.ts"),
  "utf8"
);
assert.match(hookSrc, /podeAlterarResponsavelProcesso/);
assert.match(hookSrc, /AUDITORIA_ACOES\.alteracao_responsavel_processo/);
assert.match(hookSrc, /\.\.\.auditContext/);
assert.match(hookSrc, /dadosAntes: \{[\s\S]*responsavel:/);
assert.match(hookSrc, /dadosDepois: \{[\s\S]*responsavel:/);
assert.doesNotMatch(hookSrc, /usuarioNome:\s*params/);
assert.doesNotMatch(hookSrc, /usuarioEmail:\s*params/);

const serviceSrc = readFileSync(
  join(root, "services/orcamento-responsavel.service.ts"),
  "utf8"
);
assert.match(serviceSrc, /podeAlterarResponsavelProcesso/);
assert.match(serviceSrc, /buscarPerfilUsuarioLogado/);
assert.match(serviceSrc, /alterar_responsavel_orcamento/);
assert.match(serviceSrc, /perfil\.nome/);

const rpc = readFileSync(
  join(
    root,
    "supabase/migrations/119_orcamento_alterar_responsavel_grupo_operacional.sql"
  ),
  "utf8"
);
assert.match(rpc, /create or replace function public\.alterar_responsavel_orcamento/);
assert.match(rpc, /is_staff_user\(\)/);
assert.match(rpc, /is_admin_user\(\)/);
assert.match(rpc, /'bruna', 'rafaela', 'karoline'/);
assert.doesNotMatch(
  rpc,
  /responsavel_user_id is distinct from v_caller_id/
);
assert.match(rpc, /grant execute[\s\S]+to authenticated/);

const modalSrc = readFileSync(
  join(root, "components/orcamentos/OrcamentoAlterarResponsavelModal.tsx"),
  "utf8"
);
assert.match(modalSrc, /title="Alterar responsável pelo processo"/);

console.log("test-orcamento-alterar-responsavel: OK");
