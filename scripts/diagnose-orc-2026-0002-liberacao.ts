/**
 * Diagnóstico/correção pontual: ORC-2026-0002 / liberação indevida.
 * Lê .env.local (anon). Após migration 052, chama recompute.
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
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const orc = await sb
    .from("orcamentos")
    .select("id,numero,cliente_nome,cliente_id,status")
    .eq("numero", "ORC-2026-0002")
    .maybeSingle();
  console.log("orcamento", orc.error?.message ?? orc.data);

  if (!orc.data?.id) return;

  const apr = await sb
    .from("orcamento_aprovacoes")
    .select(
      "boleto_pago,boleto_pago_em,boleto_vencimento,contrato_assinado,contrato_enviado"
    )
    .eq("orcamento_id", orc.data.id)
    .maybeSingle();
  console.log("aprovacao", apr.error?.message ?? apr.data);

  const ctr = await sb
    .from("cliente_contratos")
    .select(
      "id,numero,status,orcamento_id,cliente_id,boleto_pago,liberado_para_agendamento,numero_orcamento"
    )
    .eq("orcamento_id", orc.data.id);
  console.log("contratos", ctr.error?.message ?? ctr.data);

  const clienteId =
    (ctr.data?.[0]?.cliente_id as string | undefined) ||
    (orc.data.cliente_id as string | undefined);

  if (clienteId) {
    const cl = await sb
      .from("clientes")
      .select("id,nome,disponivel_agendamento,origem_cadastro")
      .eq("id", clienteId)
      .maybeSingle();
    console.log("cliente", cl.error?.message ?? cl.data);

    const allCtr = await sb
      .from("cliente_contratos")
      .select(
        "id,numero,orcamento_id,boleto_pago,liberado_para_agendamento,status"
      )
      .eq("cliente_id", clienteId);
    console.log("todos_contratos_cliente", allCtr.error?.message ?? allCtr.data);

    const recompute = await sb.rpc("recompute_cliente_disponivel_agendamento", {
      p_cliente_id: clienteId,
    });
    console.log(
      "recompute",
      recompute.error?.message ?? `disponivel=${recompute.data}`
    );

    const clAfter = await sb
      .from("clientes")
      .select("id,nome,disponivel_agendamento")
      .eq("id", clienteId)
      .maybeSingle();
    console.log("cliente_apos", clAfter.error?.message ?? clAfter.data);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
