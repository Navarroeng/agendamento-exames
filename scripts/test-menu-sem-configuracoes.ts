import assert from "node:assert/strict";
import { NAV_SECTIONS } from "../lib/constants";

const admin = NAV_SECTIONS.find((s) => s.title === "Administração");
assert.ok(admin);

const labels = admin!.items.map((i) => i.label);
assert.equal(labels.includes("Configurações"), false);
assert.deepEqual(labels.slice(-2), ["Usuários", "Auditoria"]);

console.log("ok: menu Administração =", labels.join(" → "));
