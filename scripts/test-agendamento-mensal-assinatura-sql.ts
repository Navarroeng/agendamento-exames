import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "..");
const migration = readFileSync(
  path.join(
    root,
    "supabase/migrations/143_agendamento_mensal_sem_primeira_parcela.sql"
  ),
  "utf8"
);
const aplicar = readFileSync(
  path.join(root, "scripts/sql/APLICAR_143_AGENDAMENTO_MENSAL_PRODUCAO.sql"),
  "utf8"
);

function corpoAssinatura(sql: string): string {
  const inicio = sql.indexOf("create or replace function public.contrato_mensal_operacional_na_data");
  const fim = sql.indexOf("create or replace function public.recompute_cliente_disponivel_agendamento");
  assert.ok(inicio >= 0 && fim > inicio);
  return sql.slice(inicio, fim);
}

for (const sql of [migration, aplicar]) {
  const assinatura = corpoAssinatura(sql);
  assert.match(assinatura, /p_contrato_assinado_em is not null/);
  assert.match(assinatura, /or coalesce\(p_contrato_assinado, false\)/);
  assert.doesNotMatch(
    assinatura,
    /or p_status in \('ativo', 'em_renovacao', 'assinado', 'aguardando_pagamento'\)/
  );
  assert.match(sql, /security definer/);
  assert.match(
    sql,
    /revoke all on function public\.recompute_cliente_disponivel_agendamento\(uuid\) from public/
  );
  assert.match(
    sql,
    /revoke all on function public\.recompute_cliente_disponivel_agendamento\(uuid\) from anon/
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.recompute_cliente_disponivel_agendamento\(uuid\)\s+to anon/
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.recompute_cliente_disponivel_agendamento\(uuid\)\s+to public/
  );
  assert.match(
    sql,
    /revoke all on function public\.contrato_mensal_operacional_na_data\([\s\S]+?\) from anon/
  );
  assert.match(sql, /status = 'encerrado'/);
  assert.doesNotMatch(sql, /encerrado_em = coalesce\(antigo\.encerrado_em, now\(\)\)/);
}

assert.match(aplicar, /^begin;/m);
assert.match(aplicar, /^commit;/m);
assert.match(aplicar, /45724418000180/);

console.log("test-agendamento-mensal-assinatura-sql: OK");
