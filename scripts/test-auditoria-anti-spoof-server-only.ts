/**
 * Anti-spoof + isolamento server-only da auditoria.
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  auditoriaActorFromAuth,
  auditoriaActorFromSessionPerfil,
  resolveAuditoriaActorIgnoringClientClaims,
} from "@/lib/auditoria";

function walkTs(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTs(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

console.log("=== test-auditoria-anti-spoof-server-only ===\n");

// 1–4: identidade ignorando claims do body
const auth = {
  user: { id: "sessao-uuid-real", email: "real@navarroeng.com.br" },
  usuarioNome: "Bruna Real",
  usuarioEmail: "bruna.real@navarroeng.com.br",
};

const bodySpoof = {
  usuarioNome: "Hacker Falso",
  usuarioEmail: "falso@evil.com",
  usuario_id: "uuid-falso",
  usuarioId: "uuid-falso-2",
};

const actor = resolveAuditoriaActorIgnoringClientClaims({ auth, body: bodySpoof });
assert.strictEqual(actor.usuarioId, "sessao-uuid-real");
assert.strictEqual(actor.usuarioNome, "Bruna Real");
assert.strictEqual(actor.usuarioEmail, "bruna.real@navarroeng.com.br");
assert.notStrictEqual(actor.usuarioNome, bodySpoof.usuarioNome);
assert.notStrictEqual(actor.usuarioEmail, bodySpoof.usuarioEmail);
assert.notStrictEqual(actor.usuarioId, bodySpoof.usuario_id);
assert.notStrictEqual(actor.usuarioId, bodySpoof.usuarioId);
console.log("1–4) OK: body falso NÃO altera id/nome/email; identidade = sessão");

const fromAuth = auditoriaActorFromAuth(auth);
assert.deepStrictEqual(fromAuth, actor);

const fromPerfil = auditoriaActorFromSessionPerfil({
  user: auth.user,
  perfil: { nome: "Bruna Real", email: "bruna.real@navarroeng.com.br" },
});
assert.strictEqual(fromPerfil.usuarioId, "sessao-uuid-real");
assert.strictEqual(fromPerfil.usuarioNome, "Bruna Real");
assert.strictEqual(fromPerfil.usuarioEmail, "bruna.real@navarroeng.com.br");
console.log("   OK: auditoriaActorFromAuth / FromSessionPerfil consistentes\n");

// Rotas API: nenhuma monta auditContext a partir de body.usuario*
const apiFiles = walkTs(path.join(process.cwd(), "app", "api"));
for (const file of apiFiles) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("auditContext") && !src.includes("registrarAuditoriaServer")) {
    continue;
  }
  assert.ok(
    !/usuarioNome:\s*body\.usuarioNome/.test(src),
    `${file}: auditContext não pode usar body.usuarioNome`
  );
  assert.ok(
    !/usuarioEmail:\s*body\.usuarioEmail/.test(src),
    `${file}: auditContext não pode usar body.usuarioEmail`
  );
  assert.ok(
    !/if\s*\(\s*body\?\.usuarioNome/.test(src),
    `${file}: não sobrescrever usuarioNome a partir do body`
  );
  assert.ok(
    !/if\s*\(\s*body\?\.usuarioEmail/.test(src),
    `${file}: não sobrescrever usuarioEmail a partir do body`
  );
  assert.ok(
    !/usuarioNome\s*=\s*body\.usuarioNome/.test(src),
    `${file}: não atribuir usuarioNome = body.usuarioNome`
  );
}
console.log("5a) OK: rotas API não alimentam identidade da auditoria via body\n");

// 5–7: isolamento client / server-only / admin
const auditoriaServer = fs.readFileSync(
  path.join(process.cwd(), "services", "auditoria.server.ts"),
  "utf8"
);
assert.ok(
  auditoriaServer.includes('import "server-only"'),
  "auditoria.server.ts deve importar server-only"
);
assert.ok(
  auditoriaServer.includes("createAdminClient"),
  "auditoria.server.ts usa createAdminClient"
);

const pkg = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")
) as { dependencies?: Record<string, string> };
assert.ok(
  pkg.dependencies?.["server-only"],
  "server-only deve estar em dependencies"
);
assert.ok(
  fs.existsSync(path.join(process.cwd(), "node_modules", "server-only")),
  "server-only deve existir em node_modules"
);
console.log("5b) OK: server-only presente e importado em auditoria.server.ts");

const clientRoots = ["hooks", "components", "contexts"];
for (const root of clientRoots) {
  for (const file of walkTs(path.join(process.cwd(), root))) {
    const src = fs.readFileSync(file, "utf8");
    assert.ok(
      !src.includes('from "@/services/auditoria.server"') &&
        !src.includes("from '@/services/auditoria.server'"),
      `${file} não pode importar auditoria.server`
    );
    assert.ok(
      !src.includes('from "@/lib/supabase/admin"') &&
        !src.includes("from '@/lib/supabase/admin'"),
      `${file} não pode importar createAdminClient/admin`
    );
  }
}
console.log("6) OK: hooks/components/contexts sem auditoria.server nem admin");

// Sem barrel reexportando auditoria.server para client
const barrelCandidates = [
  "services/index.ts",
  "services/auditoria.ts",
  "lib/index.ts",
];
for (const rel of barrelCandidates) {
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) continue;
  const src = fs.readFileSync(full, "utf8");
  assert.ok(
    !src.includes("auditoria.server"),
    `${rel} não deve reexportar auditoria.server`
  );
}
console.log("7) OK: createAdminClient permanece server-side; sem barrel client\n");

// Simula o que a rota faz: body spoof + auth real → payload INSERT
const payload = {
  usuario_id: actor.usuarioId,
  usuario_nome: actor.usuarioNome,
  usuario_email: actor.usuarioEmail,
};
assert.deepStrictEqual(payload, {
  usuario_id: "sessao-uuid-real",
  usuario_nome: "Bruna Real",
  usuario_email: "bruna.real@navarroeng.com.br",
});
console.log("OK: payload INSERT usa identidade autenticada, não o body spoof");
console.log("\n=== PASSOU ===");
