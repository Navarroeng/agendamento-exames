/** Smoke: menu reorganizado e grupos Gestão/Administração exclusivos do admin. */

import assert from "node:assert/strict";
import { NAV_SECTIONS } from "../lib/constants";
import { canAccessPath, filterNavSectionsByPerfil } from "../lib/perfil-access";

assert.deepEqual(
  NAV_SECTIONS.map((s) => s.title),
  [
    "",
    "Exames",
    "Gestão Comercial",
    "Laudos",
    "Faturas",
    "Cadastros",
    "Gestão",
    "Administração",
  ]
);

assert.deepEqual(
  NAV_SECTIONS[0]?.items.map((i) => i.label),
  ["Dashboard"]
);

assert.deepEqual(
  NAV_SECTIONS.find((s) => s.title === "Exames")?.items.map((i) => i.label),
  ["Agendamentos", "Periódicos Futuros"]
);

assert.deepEqual(
  NAV_SECTIONS.find((s) => s.title === "Laudos")?.items.map((i) => i.label),
  ["e-Social", "Laudos SST", "Riscos Psicossociais"]
);

assert.deepEqual(
  NAV_SECTIONS.find((s) => s.title === "Gestão Comercial")?.items.map(
    (i) => i.label
  ),
  ["Orçamentos", "Implantação de Clientes"]
);

assert.deepEqual(
  NAV_SECTIONS.find((s) => s.title === "Gestão")?.items.map((i) => i.label),
  ["Gestão Comercial", "Relatórios"]
);

assert.deepEqual(
  NAV_SECTIONS.find((s) => s.title === "Administração")?.items.map(
    (i) => i.label
  ),
  ["Usuários", "Auditoria"]
);

const adminSections = filterNavSectionsByPerfil(NAV_SECTIONS, "admin");
assert.equal(adminSections.length, NAV_SECTIONS.length);

const operacionalSections = filterNavSectionsByPerfil(
  NAV_SECTIONS,
  "operacional"
);
assert.deepEqual(
  operacionalSections.map((s) => s.title),
  ["", "Exames", "Gestão Comercial", "Laudos", "Faturas", "Cadastros"]
);
assert.ok(!operacionalSections.some((s) => s.title === "Gestão"));
assert.ok(!operacionalSections.some((s) => s.title === "Administração"));
assert.ok(!operacionalSections.some((s) => s.title === "Operação"));

assert.equal(canAccessPath("operacional", "/gestao-comercial"), false);
assert.equal(canAccessPath("operacional", "/relatorios"), false);
assert.equal(canAccessPath("operacional", "/usuarios"), false);
assert.equal(canAccessPath("operacional", "/auditoria"), false);
assert.equal(canAccessPath("operacional", "/orcamentos"), true);
assert.equal(canAccessPath("operacional", "/faturas-clientes"), true);
assert.equal(canAccessPath("operacional", "/dashboard"), true);
assert.equal(canAccessPath("operacional", "/e-social"), true);

assert.equal(canAccessPath("admin", "/gestao-comercial"), true);
assert.equal(canAccessPath("admin", "/usuarios"), true);

console.log("test-menu-permissoes-admin: OK");
