/**
 * Correção pontual: ORC-2026-0010 / CTR-2026-0005 / AFDY
 * Encerrar outro ativo antes de espelhar boleto/status (evita idx_um_ativo).
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { buildClienteContratoSyncFromAprovacao } from "../lib/cliente-contrato-orcamento-sync";

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

const NUMERO_ORC = "ORC-2026-0010";
const NUMERO_CTR = "CTR-2026-0005";

async function main() {
  const env = loadEnvLocal();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const orc = await sb
    .from("orcamentos")
    .select("id,numero,cliente_nome,cliente_id")
    .eq("numero", NUMERO_ORC)
    .maybeSingle();
  console.log("orcamento", orc.error?.message ?? orc.data);
  if (!orc.data?.id) {
    console.error("Use a migration 066 no SQL Editor (anon sem acesso RLS).");
    process.exit(1);
  }

  const apr = await sb
    .from("orcamento_aprovacoes")
    .select(
      "boleto_pago,boleto_pago_em,boleto_vencimento,contrato_assinado,contrato_assinado_em,contrato_enviado,contrato_enviado_em"
    )
    .eq("orcamento_id", orc.data.id)
    .maybeSingle();
  console.log("aprovacao", apr.data);

  let ctr = await sb
    .from("cliente_contratos")
    .select("*")
    .eq("orcamento_id", orc.data.id)
    .not("status", "in", "(encerrado,cancelado)")
    .maybeSingle();

  if (!ctr.data) {
    ctr = await sb
      .from("cliente_contratos")
      .select("*")
      .eq("numero", NUMERO_CTR)
      .maybeSingle();
  }
  console.log("contrato_antes", {
    id: ctr.data?.id,
    numero: ctr.data?.numero,
    status: ctr.data?.status,
    boleto_pago: ctr.data?.boleto_pago,
    liberado: ctr.data?.liberado_para_agendamento,
  });

  if (!ctr.data?.id || !apr.data) {
    process.exit(1);
  }

  const syncPayload = buildClienteContratoSyncFromAprovacao({
    aprovacao: {
      contrato_enviado: Boolean(apr.data.contrato_enviado),
      contrato_assinado: Boolean(apr.data.contrato_assinado),
      contrato_assinado_em: apr.data.contrato_assinado_em,
      contrato_enviado_em: apr.data.contrato_enviado_em,
      boleto_pago: Boolean(apr.data.boleto_pago),
      boleto_vencimento: apr.data.boleto_vencimento,
      boleto_pago_em: apr.data.boleto_pago_em,
    },
  });

  const dataRef = String(
    ctr.data.data_inicio || syncPayload.data_inicio || new Date().toISOString()
  ).slice(0, 10);
  const fimAnterior = (() => {
    const d = new Date(`${dataRef}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  if (syncPayload.status === "ativo") {
    const enc = await sb
      .from("cliente_contratos")
      .update({
        status: "encerrado",
        data_fim: fimAnterior,
        updated_at: new Date().toISOString(),
      })
      .eq("cliente_id", ctr.data.cliente_id)
      .eq("status", "ativo")
      .neq("id", ctr.data.id);
    if (enc.error) throw enc.error;
    console.log("outros_ativos_encerrados");
  }

  const { data: updated, error } = await sb
    .from("cliente_contratos")
    .update({
      status: syncPayload.status,
      boleto_pago: syncPayload.boleto_pago,
      boleto_pago_em: syncPayload.boleto_pago_em,
      boleto_vencimento: syncPayload.boleto_vencimento,
      liberado_para_agendamento: syncPayload.liberado_para_agendamento,
      contrato_assinado_em: syncPayload.contrato_assinado_em,
      contrato_enviado_em: syncPayload.contrato_enviado_em,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ctr.data.id)
    .select("id,numero,status,boleto_pago,liberado_para_agendamento")
    .single();
  if (error) throw error;
  console.log("contrato_depois", updated);

  const recompute = await sb.rpc("recompute_cliente_disponivel_agendamento", {
    p_cliente_id: ctr.data.cliente_id,
  });
  console.log("recompute", recompute.error?.message ?? recompute.data);
  console.log("ok:", NUMERO_ORC, NUMERO_CTR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
