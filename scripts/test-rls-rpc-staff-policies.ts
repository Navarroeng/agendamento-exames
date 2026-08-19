import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const M109 = path.join(ROOT, "supabase/migrations/109_rls_staff_user.sql");
const M110 = path.join(
  ROOT,
  "supabase/migrations/110_proteger_rpcs_authenticated.sql"
);
const ROLLBACK_109 = path.join(
  ROOT,
  "scripts/sql/rollback-109-rls-staff-user.sql"
);
const ROLLBACK_110 = path.join(
  ROOT,
  "scripts/sql/rollback-110-proteger-rpcs.sql"
);

const STAFF_RPCS = [
  "aprovar_orcamento_integrar_cliente",
  "recompute_cliente_disponivel_agendamento",
  "assert_cliente_sem_inadimplencia",
  "alterar_responsavel_orcamento",
  "gerar_numero_orcamento",
] as const;

const SERVER_RPCS = [
  "backfill_orcamentos_aprovados_clientes",
  "gerar_numero_contrato",
  "contrato_libera_agendamento",
] as const;

const STAFF_GATE = "RPC_STAFF_ONLY";

function run(name: string, fn: () => void) {
  fn();
  console.log(`OK  ${name}`);
}

function read(p: string): string {
  return readFileSync(p, "utf8");
}

function functionBody(sql: string, name: string): string {
  const start = sql.indexOf(`create or replace function public.${name}`);
  assert.ok(start >= 0, `função ${name} ausente`);
  const next = sql.indexOf("create or replace function public.", start + 10);
  const revoke = sql.indexOf("\nrevoke all on function public.", start + 10);
  let end = sql.length;
  if (next >= 0) end = Math.min(end, next);
  if (revoke >= 0) end = Math.min(end, revoke);
  return sql.slice(start, end);
}

assert.equal(existsSync(M109), true);
assert.equal(existsSync(M110), true);
assert.equal(existsSync(ROLLBACK_110), true);

const m109 = read(M109);
const m110 = read(M110);
const rb110 = read(ROLLBACK_110);
const rb109 = read(ROLLBACK_109);

run("110 é independente e não edita a 109", () => {
  assert.match(m110, /REQUER a migration 109/);
  assert.doesNotMatch(m110, /create policy/);
  assert.doesNotMatch(m110, /authenticated_select_clinicas/);
  assert.doesNotMatch(m109, new RegExp(STAFF_GATE));
  assert.doesNotMatch(m109, /110_proteger/);
});

run("helpers puros não são reescritos", () => {
  assert.doesNotMatch(m110, /create or replace function public\.calcular_fim_vigencia_meses/);
  assert.doesNotMatch(
    m110,
    /create or replace function public\.resolve_status_contrato_from_aprovacao/
  );
});

run("is_admin_user / is_staff_user continuam executáveis por authenticated", () => {
  assert.match(
    m110,
    /grant execute on function public\.is_admin_user\(\) to authenticated/
  );
  assert.match(
    m110,
    /grant execute on function public\.is_staff_user\(\) to authenticated/
  );
  assert.match(m110, /revoke all on function public\.is_admin_user\(\) from public/);
  assert.match(m110, /revoke all on function public\.is_admin_user\(\) from anon/);
  assert.match(m110, /revoke all on function public\.is_staff_user\(\) from public/);
  assert.match(m110, /revoke all on function public\.is_staff_user\(\) from anon/);
  assert.doesNotMatch(
    m110,
    /if auth\.uid\(\) is not null and not public\.is_staff_user\(\)[\s\S]{0,80}is_admin_user/
  );
});

run("RPCs staff-only têm barreira is_staff_user e search_path nas DEFINER", () => {
  for (const name of STAFF_RPCS) {
    const body = functionBody(m110, name);
    assert.match(body, /not public\.is_staff_user\(\)/);
    assert.match(body, new RegExp(STAFF_GATE));
    assert.match(
      m110,
      new RegExp(`revoke all on function public\\.${name}[\\s\\S]{0,80} from public`)
    );
    assert.match(
      m110,
      new RegExp(`revoke all on function public\\.${name}[\\s\\S]{0,80} from anon`)
    );
    assert.match(
      m110,
      new RegExp(
        `grant execute on function public\\.${name}[\\s\\S]{0,80} to authenticated`
      )
    );
    assert.match(
      m110,
      new RegExp(
        `grant execute on function public\\.${name}[\\s\\S]{0,80} to service_role`
      )
    );
  }

  const aprovar = functionBody(m110, "aprovar_orcamento_integrar_cliente");
  assert.match(aprovar, /security definer/);
  assert.match(aprovar, /set search_path = public/);
  assert.doesNotMatch(aprovar, /execute\s+'/);
  assert.doesNotMatch(aprovar, /aprovado_por[\s\S]{0,40}is_staff_user/);

  const alterar = functionBody(m110, "alterar_responsavel_orcamento");
  const gateIdx = alterar.indexOf("is_staff_user()");
  const adminIdx = alterar.indexOf("is_admin_user()");
  const donoIdx = alterar.indexOf("responsavel_user_id is distinct from v_caller_id");
  assert.ok(gateIdx >= 0 && adminIdx >= 0 && donoIdx > gateIdx);
  assert.ok(
    alterar.indexOf("RPC_STAFF_ONLY") < donoIdx,
    "barreira staff deve vir antes da regra admin/responsável"
  );
});

run("RPCs server-only: sem EXECUTE authenticated/anon/PUBLIC; service_role sim", () => {
  for (const name of SERVER_RPCS) {
    assert.doesNotMatch(
      m110,
      new RegExp(
        `create or replace function public\\.${name}`
      )
    );
    assert.match(
      m110,
      new RegExp(`revoke all on function public\\.${name}[\\s\\S]{0,90} from public`)
    );
    assert.match(
      m110,
      new RegExp(`revoke all on function public\\.${name}[\\s\\S]{0,90} from anon`)
    );
    assert.match(
      m110,
      new RegExp(
        `revoke all on function public\\.${name}[\\s\\S]{0,90} from authenticated`
      )
    );
    assert.match(
      m110,
      new RegExp(
        `grant execute on function public\\.${name}[\\s\\S]{0,90} to service_role`
      )
    );
    assert.doesNotMatch(
      m110,
      new RegExp(
        `grant execute on function public\\.${name}[\\s\\S]{0,90} to authenticated`
      )
    );
  }
});

run("rollback 110 restaura corpos sem RPC_STAFF_ONLY e não mexe na 109", () => {
  assert.doesNotMatch(rb110, /raise exception\s+'RPC_STAFF_ONLY/);
  assert.doesNotMatch(rb110, /drop function if exists public\.is_staff_user/);
  assert.doesNotMatch(rb110, /drop policy/);
  assert.match(
    rb110,
    /create or replace function public\.aprovar_orcamento_integrar_cliente/
  );
  assert.match(rb110, /grant execute on function public\.is_admin_user\(\) to public/);
  assert.match(
    rb109.slice(0, 400).toUpperCase(),
    /NÃO EXECUTAR|NAO EXECUTAR/
  );
  assert.match(
    rb110.slice(0, 400).toUpperCase(),
    /NÃO EXECUTAR|NAO EXECUTAR/
  );
});

type Actor =
  | "admin"
  | "operacional"
  | "authenticated_sem_perfil"
  | "anon"
  | "service_role";

function isStaff(actor: Actor): boolean {
  return actor === "admin" || actor === "operacional";
}

function canUseTableAfter109(actor: Actor): boolean {
  if (actor === "service_role") return true;
  return isStaff(actor);
}

function canExecuteStaffRpcAfter110(actor: Actor): boolean {
  if (actor === "anon") return false;
  if (actor === "authenticated_sem_perfil") return false;
  if (actor === "service_role") return true;
  return isStaff(actor);
}

function canExecuteServerRpcAfter110(actor: Actor): boolean {
  return actor === "service_role";
}

run("109+110: tabelas e RPCs — matriz conceitual", () => {
  const actors: Actor[] = [
    "admin",
    "operacional",
    "authenticated_sem_perfil",
    "anon",
    "service_role",
  ];

  for (const actor of actors) {
    const tables = canUseTableAfter109(actor);
    const staffRpc = canExecuteStaffRpcAfter110(actor);
    const serverRpc = canExecuteServerRpcAfter110(actor);

    if (actor === "admin" || actor === "operacional") {
      assert.equal(tables, true, `${actor} tabelas`);
      assert.equal(staffRpc, true, `${actor} RPC staff`);
      assert.equal(serverRpc, false, `${actor} não chama backfill via JWT`);
    }
    if (actor === "authenticated_sem_perfil") {
      assert.equal(tables, false, "cliente: 109 bloqueia PostgREST");
      assert.equal(staffRpc, false, "cliente: 110 bloqueia RPC staff");
      assert.equal(serverRpc, false, "cliente: 110 revoga RPC server");
    }
    if (actor === "anon") {
      assert.equal(tables, false);
      assert.equal(staffRpc, false);
      assert.equal(serverRpc, false);
    }
    if (actor === "service_role") {
      assert.equal(tables, true);
      assert.equal(staffRpc, true);
      assert.equal(serverRpc, true);
    }
  }
});

run("alterar responsável: staff primeiro, depois admin vs dono", () => {
  const alterar = functionBody(m110, "alterar_responsavel_orcamento");
  assert.match(alterar, /v_is_admin boolean := public\.is_admin_user\(\)/);
  assert.match(
    alterar,
    /if not v_is_admin then[\s\S]+responsavel_user_id is distinct from v_caller_id/
  );
  const operacionalPodeSerDono =
    isStaff("operacional") && canExecuteStaffRpcAfter110("operacional");
  assert.equal(operacionalPodeSerDono, true);
});

run("nenhum caminho lateral 109↔110 nas tabelas protegidas do colaborador", () => {
  assert.doesNotMatch(m110, /riscos_avaliacao_sessoes/);
  assert.doesNotMatch(m110, /riscos_avaliacao_respostas/);
  assert.doesNotMatch(m109, /create policy[\s\S]{0,80}riscos_avaliacao_sessoes/);
});

console.log("\nTestes estruturais da migration 110 (RPCs) concluídos.");
