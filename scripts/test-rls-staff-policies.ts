import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const MIGRATION_PATH = path.join(
  ROOT,
  "supabase",
  "migrations",
  "109_rls_staff_user.sql"
);
const ROLLBACK_PATH = path.join(
  ROOT,
  "scripts",
  "sql",
  "rollback-109-rls-staff-user.sql"
);

const UUID_FOLDER_RE =
  String.raw`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`;

const PROTECTED_TABLES = [
  "riscos_avaliacao_sessoes",
  "riscos_avaliacao_vinculos",
  "riscos_avaliacao_respostas",
  "riscos_portal_auditoria",
] as const;

const RISCOS_STAFF_TABLES = [
  "riscos_campanhas",
  "riscos_campanha_participantes",
  "riscos_relatorios",
  "orcamento_riscos_psicossociais",
] as const;

const STORAGE_POLICY_NAMES = [
  "riscos_psicossociais_auth_select",
  "riscos_psicossociais_auth_insert",
  "riscos_psicossociais_auth_update",
  "riscos_psicossociais_auth_delete",
  "orcamentos_onboarding_auth_select",
  "orcamentos_onboarding_auth_insert",
  "orcamentos_onboarding_auth_update",
  "orcamentos_onboarding_auth_delete",
  "authenticated_select_agendamentos_aso_retido",
  "authenticated_insert_agendamentos_aso_retido",
  "authenticated_update_agendamentos_aso_retido",
  "authenticated_delete_agendamentos_aso_retido",
  "authenticated_select_faturas_comprovantes",
  "authenticated_insert_faturas_comprovantes",
  "authenticated_update_faturas_comprovantes",
  "authenticated_delete_faturas_comprovantes",
  "authenticated_select_orcamentos_comprovantes",
  "authenticated_insert_orcamentos_comprovantes",
  "authenticated_update_orcamentos_comprovantes",
  "authenticated_delete_orcamentos_comprovantes",
] as const;

const BROWSER_CLIENT_SERVICES: Record<string, string[]> = {
  Agendamentos: [
    "services/agendamento.service.ts",
    "services/agendamento-aso-retido.service.ts",
    "services/historico.service.ts",
    "services/periodico-futuro.service.ts",
  ],
  Clientes: ["services/cliente.service.ts", "services/cliente-contrato.service.ts"],
  Clinicas: ["services/clinica.service.ts", "services/clinica-exame.service.ts"],
  Exames: ["services/exame.service.ts", "services/cargo.service.ts"],
  Contratos: [
    "services/contrato-agendamentos.service.ts",
    "services/contrato-creditos-aso.service.ts",
  ],
  Implantacao: [
    "services/implantacao-clientes.service.ts",
    "services/implantacao-treinamento.service.ts",
  ],
  "Laudos SST": ["services/laudos-sst.service.ts"],
  "Riscos Psicossociais": [
    "services/riscos-psicossociais.service.ts",
    "services/riscos-campanha.service.ts",
    "services/riscos-campanha-participantes.service.ts",
    "services/riscos-lista-presenca.service.ts",
  ],
  Faturas: [
    "services/fatura.service.ts",
    "services/fatura-comprovante.service.ts",
  ],
  Relatorios: ["services/relatorios.service.ts"],
  eSocial: ["services/esocial-recibo.service.ts"],
};

type PolicyOp = "SELECT" | "INSERT" | "UPDATE" | "DELETE";
type PolicyRow = { table: string; name: string; op: PolicyOp };

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function read(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function parseStaffTablePolicies(sql: string): PolicyRow[] {
  const begin = sql.indexOf("-- BEGIN STAFF_TABLE_POLICIES");
  const end = sql.indexOf("-- END STAFF_TABLE_POLICIES");
  assert.ok(begin >= 0 && end > begin, "marcadores BEGIN/END STAFF_TABLE_POLICIES ausentes");
  const block = sql.slice(begin, end);
  const rows: PolicyRow[] = [];
  const re =
    /\('([a-z0-9_]+)',\s*'([a-z0-9_]+)',\s*'(SELECT|INSERT|UPDATE|DELETE)'\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(block))) {
    rows.push({
      table: match[1],
      name: match[2],
      op: match[3] as PolicyOp,
    });
  }
  return rows;
}

function conceptualIsStaffUser(row: {
  perfil?: string | null;
  ativo?: boolean | null;
} | null): boolean {
  if (!row) return false;
  if (row.ativo !== true) return false;
  return row.perfil === "admin" || row.perfil === "operacional";
}

assert.equal(existsSync(MIGRATION_PATH), true, "migration 109 ausente");
assert.equal(existsSync(ROLLBACK_PATH), true, "rollback 109 ausente");

const migration = read(MIGRATION_PATH);
const rollback = read(ROLLBACK_PATH);
const policies = parseStaffTablePolicies(migration);
const rollbackPolicies = parseStaffTablePolicies(rollback);

run("rollback está fora de supabase/migrations", () => {
  assert.equal(
    ROLLBACK_PATH.includes(`${path.sep}supabase${path.sep}migrations${path.sep}`),
    false
  );
  const rollbackHeader = rollback.slice(0, 400).toUpperCase();
  assert.match(rollbackHeader, /NÃO EXECUTAR|NAO EXECUTAR/);
});

run("função is_staff_user no padrão is_admin_user", () => {
  assert.match(migration, /create or replace function public\.is_staff_user\(\)/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /set search_path = public/);
  assert.match(migration, /language sql/);
  assert.match(migration, /stable/);
  assert.match(
    migration,
    /perfil in \('admin',\s*'operacional'\)/
  );
  assert.match(migration, /ativo = true/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.doesNotMatch(migration, /@navarro/i);
  assert.doesNotMatch(migration, /email\s+like/i);
  assert.doesNotMatch(migration, /raw_user_meta_data/);
  assert.match(
    migration,
    /revoke all on function public\.is_staff_user\(\) from public/
  );
  assert.match(
    migration,
    /grant execute on function public\.is_staff_user\(\) to authenticated/
  );
});

run("não duplica is_admin_user; SELECT da auditoria permanece admin", () => {
  assert.doesNotMatch(
    migration,
    /create or replace function public\.is_admin_user/
  );
  assert.doesNotMatch(migration, /admin_select_auditoria_sistema/);
  assert.match(
    migration,
    /authenticated_insert_auditoria_sistema[\s\S]*with check \(public\.is_staff_user\(\)\)/
  );
});

run("inventário de policies administrativas é o esperado", () => {
  assert.equal(policies.length, 102, `esperado 102 policies, veio ${policies.length}`);

  const byTable = new Map<string, PolicyOp[]>();
  for (const row of policies) {
    const ops = byTable.get(row.table) ?? [];
    ops.push(row.op);
    byTable.set(row.table, ops);
  }

  assert.deepEqual(byTable.get("fatura_itens"), ["SELECT", "INSERT", "DELETE"]);
  assert.deepEqual(byTable.get("gestao_comercial_historico_mensal"), ["SELECT"]);
  assert.deepEqual(byTable.get("implantacao_treinamentos"), [
    "SELECT",
    "INSERT",
    "UPDATE",
  ]);
  assert.deepEqual(byTable.get("implantacao_treinamentos_eventos"), [
    "SELECT",
    "INSERT",
  ]);
  assert.deepEqual(byTable.get("riscos_campanhas"), [
    "SELECT",
    "INSERT",
    "UPDATE",
  ]);
  assert.ok(!byTable.get("clinicas")?.includes("DELETE"));
  assert.ok(!byTable.get("clientes")?.includes("DELETE"));
  assert.ok(!byTable.get("faturas")?.includes("DELETE"));
  assert.ok(!byTable.get("auditoria_sistema"));
  assert.ok(!byTable.get("perfis_usuarios"));

  for (const table of RISCOS_STAFF_TABLES) {
    assert.ok(byTable.has(table), `faltou ${table} no inventário staff`);
  }
});

run("policies novas usam is_staff_user e não using(true) nas tabelas staff", () => {
  const staffBlockStart = migration.indexOf("-- BEGIN STAFF_TABLE_POLICIES");
  const staffBlock = migration.slice(staffBlockStart);
  assert.match(
    staffBlock,
    /using \(public\.is_staff_user\(\)\)/
  );
  assert.match(
    staffBlock,
    /with check \(public\.is_staff_user\(\)\)/
  );
  assert.doesNotMatch(
    staffBlock,
    /using \(true\)/
  );
  assert.doesNotMatch(
    staffBlock,
    /with check \(true\)/
  );
});

run("tabelas protegidas do colaborador não ganham policy", () => {
  for (const table of PROTECTED_TABLES) {
    const policyOnTable = new RegExp(
      `create policy[\\s\\S]{0,120}on (public\\.)?${table}`,
      "i"
    );
    assert.doesNotMatch(migration, policyOnTable);
    assert.ok(
      !policies.some((row) => row.table === table),
      `${table} não deve estar no inventário staff`
    );
  }
});

run("perfis_usuarios: SELECT staff + UPDATE próprio staff + trigger", () => {
  assert.match(
    migration,
    /authenticated_select_perfis[\s\S]*using \(public\.is_staff_user\(\)\)/
  );
  assert.match(
    migration,
    /using \(auth\.uid\(\) = user_id and public\.is_staff_user\(\)\)/
  );
  assert.match(
    migration,
    /trg_perfis_usuarios_bloquear_escalonamento/
  );
  assert.match(migration, /if auth\.uid\(\) is null then/);
  assert.match(migration, /NEW\.perfil is distinct from OLD\.perfil/);
  assert.match(migration, /NEW\.ativo is distinct from OLD\.ativo/);
  assert.doesNotMatch(
    migration,
    /create policy[\s\S]{0,80}insert[\s\S]{0,80}perfis_usuarios/
  );
});

run("storage administrativo exige is_staff_user e preserva pasta UUID", () => {
  for (const name of STORAGE_POLICY_NAMES) {
    assert.match(
      migration,
      new RegExp(`create policy "${name}"`)
    );
  }
  const storageSection = migration.slice(
    migration.indexOf("Storage administrativo")
  );
  assert.equal(
    (storageSection.match(/public\.is_staff_user\(\)/g) ?? []).length >= 20,
    true
  );
  const uuidHits = storageSection.match(
    /\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$/g
  );
  assert.equal(uuidHits?.length, 15, "regex UUID de storage incompleta ou faltando");
  assert.doesNotMatch(
    storageSection,
    /\^\[0-9a-f\]\{8\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{4\}-\[0-9a-f\]\{12\}\$/
  );
  assert.equal(storageSection.includes(UUID_FOLDER_RE), true);
});

run("rollback restaura o mesmo inventário e remove a função", () => {
  const migKeys = policies.map((p) => `${p.table}|${p.name}|${p.op}`).sort();
  const rbKeys = rollbackPolicies
    .map((p) => `${p.table}|${p.name}|${p.op}`)
    .sort();
  assert.deepEqual(rbKeys, migKeys);
  assert.match(rollback, /using \(true\)/);
  assert.match(rollback, /with check \(true\)/);
  assert.match(rollback, /drop function if exists public\.is_staff_user\(\)/);
  assert.match(
    rollback,
    /drop function if exists public\.perfis_usuarios_bloquear_escalonamento\(\)/
  );
  assert.doesNotMatch(rollback, /drop function if exists public\.is_admin_user/);
});

run("cenários A–E da função staff (espelho da SQL)", () => {
  assert.equal(
    conceptualIsStaffUser({ perfil: "admin", ativo: true }),
    true,
    "A admin ativo"
  );
  assert.equal(
    conceptualIsStaffUser({ perfil: "operacional", ativo: true }),
    true,
    "B operacional ativo"
  );
  assert.equal(conceptualIsStaffUser(null), false, "C sem perfil");
  assert.equal(
    conceptualIsStaffUser({ perfil: "admin", ativo: false }),
    false,
    "D inativo"
  );
  assert.equal(
    conceptualIsStaffUser({ perfil: "operacional", ativo: false }),
    false,
    "D operacional inativo"
  );
  assert.equal(
    conceptualIsStaffUser({ perfil: "cliente", ativo: true }),
    false,
    "E futuro cliente"
  );
});

run("services administrativos usam JWT do browser, não authenticated órfão", () => {
  const clientImport =
    /from ["']@\/lib\/supabase\/client["']|createBrowserClient/;
  const missing: string[] = [];
  for (const [modulo, files] of Object.entries(BROWSER_CLIENT_SERVICES)) {
    for (const rel of files) {
      const abs = path.join(ROOT, rel);
      if (!existsSync(abs)) {
        missing.push(`${modulo}: ${rel} (arquivo ausente)`);
        continue;
      }
      const src = read(abs);
      if (rel.replace(/\\/g, "/").endsWith("services/relatorios.service.ts")) {
        assert.match(src, /listarAgendamentosComExames|listarFaturas/);
        assert.doesNotMatch(src, /createAdminClient/);
        continue;
      }
      if (!clientImport.test(src)) {
        missing.push(`${modulo}: ${rel} (sem client browser)`);
      }
    }
  }
  assert.equal(missing.join("\n"), "", missing.join("\n"));
});

run("não há fluxo de frontend autenticado sem perfis_usuarios no admin", () => {
  const appShell = read(path.join(ROOT, "components/layout/AppShell.tsx"));
  assert.match(appShell, /if \(!profile\)/);
  const perfilService = read(path.join(ROOT, "services/perfil.service.ts"));
  assert.match(perfilService, /if \(!data\.ativo\) return null/);
  assert.match(perfilService, /from\("perfis_usuarios"\)/);
});

run("109 permanece na sequência; 110 é a mais recente", () => {
  const dir = path.join(ROOT, "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.equal(files.includes("109_rls_staff_user.sql"), true);
  assert.equal(files.includes("108_laudos_sst_workflow.sql"), true);
  assert.equal(files.includes("110_proteger_rpcs_authenticated.sql"), true);
  const numeric = files.map((f) => Number(f.slice(0, 3)));
  assert.equal(Math.max(...numeric), 110);
});

console.log(`\n${policies.length} policies public.* no inventário staff.`);
console.log("Testes estruturais da migration 109 concluídos.");
