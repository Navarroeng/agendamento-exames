/**
 * Garante que a definição ATIVA (última migration) da RPC de aprovação
 * não grave mais clientes.procuracao = 'inativa'.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

function latestDefining(fnName: string): { file: string; sql: string } {
  const mentioning = files.filter((f) => {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    return new RegExp(
      `create or replace function public\\.${fnName}`,
      "i"
    ).test(sql);
  });
  assert.ok(
    mentioning.length > 0,
    `Nenhuma migration redefine ${fnName}`
  );
  const file = mentioning[mentioning.length - 1];
  return {
    file,
    sql: fs.readFileSync(path.join(migrationsDir, file), "utf8"),
  };
}

function assertClienteInsertUsaPendente(label: string, sql: string) {
  const idx = sql.search(/insert into public\.clientes/i);
  assert.ok(idx >= 0, `${label}: insert em clientes não encontrado`);
  // Janela do INSERT (coluna + VALUES com expressões SQL).
  const window = sql.slice(idx, idx + 1200);
  assert.match(
    window,
    /'pendente'/,
    `${label}: insert de cliente deve usar procuracao 'pendente'`
  );
  assert.doesNotMatch(
    window,
    /'inativa'/,
    `${label}: insert de cliente não pode usar procuracao 'inativa'`
  );
}

const aprovacao = latestDefining("aprovar_orcamento_integrar_cliente");
assertClienteInsertUsaPendente(aprovacao.file, aprovacao.sql);

const backfill = latestDefining("backfill_orcamentos_aprovados_clientes");
assertClienteInsertUsaPendente(backfill.file, backfill.sql);

console.log(
  "test-aprovacao-rpc-procuracao: OK",
  `(aprovacao=${aprovacao.file}, backfill=${backfill.file})`
);
