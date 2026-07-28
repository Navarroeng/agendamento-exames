/**
 * Diagnóstico pontual: orçamentos aprovados x clientes/contratos.
 * Usa apenas variáveis já presentes em .env.local (anon key).
 * Não imprime secrets.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal(): Record<string, string> {
  const raw = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Faltam NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
    process.exit(1);
  }

  console.log("supabase_host", new URL(url).host);
  const sb = createClient(url, key);

  const orcs = await sb
    .from("orcamentos")
    .select("id,numero,cliente_nome,cliente_cnpj,status,cliente_id")
    .eq("status", "aprovado");
  console.log("aprovados_error", orcs.error?.message ?? null);
  console.log("aprovados_count", orcs.data?.length ?? 0);
  for (const o of orcs.data ?? []) {
    console.log(
      "orc",
      o.numero,
      "|",
      o.cliente_nome,
      "| cliente_id=",
      o.cliente_id ?? "null",
      "| cnpj=",
      o.cliente_cnpj ?? "null"
    );
  }

  const contratos = await sb
    .from("cliente_contratos")
    .select("id,numero,status,orcamento_id,cliente_id,numero_orcamento,boleto_pago,boleto_vencimento");
  console.log("contratos_error", contratos.error?.message ?? null);
  console.log("contratos_count", contratos.data?.length ?? 0);
  for (const c of contratos.data ?? []) {
    console.log(
      "ctr",
      c.numero,
      "| orc=",
      c.numero_orcamento,
      "| status=",
      c.status,
      "| orcamento_id=",
      c.orcamento_id
    );
  }

  const rpcExists = await sb.rpc("gerar_numero_contrato");
  console.log(
    "rpc_gerar_numero_contrato",
    rpcExists.error?.message ?? `ok:${rpcExists.data}`
  );

  const backfillProbe = await sb.rpc("backfill_orcamentos_aprovados_clientes");
  console.log(
    "rpc_backfill",
    backfillProbe.error?.message ?? JSON.stringify(backfillProbe.data)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
