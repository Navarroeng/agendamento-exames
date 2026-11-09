/**
 * O menu do celular e o menu do computador renderizam o mesmo painel,
 * filtrado por filterNavSectionsByPerfil(NAV_SECTIONS, perfil).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NAV_SECTIONS } from "../lib/constants";
import { filterNavSectionsByPerfil } from "../lib/perfil-access";

const sidebar = readFileSync(
  join(process.cwd(), "components/layout/Sidebar.tsx"),
  "utf8"
);
const shell = readFileSync(
  join(process.cwd(), "components/layout/AppShell.tsx"),
  "utf8"
);

assert.match(
  sidebar,
  /filterNavSectionsByPerfil\(NAV_SECTIONS, profile\?\.perfil\)/
);
assert.equal((sidebar.match(/<SidebarPanel/g) ?? []).length, 2);
assert.match(shell, /<Sidebar \/>/);
assert.match(shell, /<MobileMenu[\s\S]/);
assert.match(shell, /<MobileMenuButton[\s\S]/);

function labels(perfil: "admin" | "operacional") {
  return filterNavSectionsByPerfil(NAV_SECTIONS, perfil).flatMap((section) =>
    section.items.map((item) => item.label)
  );
}

const admin = labels("admin");
const operacional = labels("operacional");

assert.ok(admin.includes("Gestão Comercial"));
assert.ok(admin.includes("Relatórios"));
assert.ok(admin.includes("Usuários"));
assert.ok(admin.includes("Auditoria"));
assert.ok(admin.includes("Exames"));

assert.equal(operacional.includes("Gestão Comercial"), false);
assert.equal(operacional.includes("Relatórios"), false);
assert.equal(operacional.includes("Usuários"), false);
assert.equal(operacional.includes("Auditoria"), false);
assert.equal(operacional.includes("Exames"), false);
assert.ok(operacional.includes("Agendamentos"));
assert.ok(operacional.includes("Cobranças"));
assert.ok(operacional.includes("Portal do Cliente"));

console.log("test-menu-mobile: OK");
