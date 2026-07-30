/**
 * Correção pontual: ORC-2026-0010 / AFDY ARTIGOS ESPORTIVOS
 * Espelha boleto_pago da aprovação no contrato e recomputa liberação.
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

const NUMERO = "ORC-2026-0010";

async function main() {
  const env = loadEnvLocal();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const orc = await sb
    .from("orcamentos")
    .select("id,numero,cliente_nome,cliente_id,status,origem_cliente")
    .eq("numero", NUMERO)
    .maybeSingle();
  if (orc.error) throw orc.error;
  console.log("orcamento", orc.data);
  if (!orc.data?.id) {
    console.error("Orçamento não encontrado.");
    process.exit(1);
  }

  const apr = await sb
    .from("orcamento_aprovacoes")
    .select(
      "id,boleto_pago,boleto_pago_em,boleto_vencimento,contrato_assinado,contrato_assinado_em,contrato_enviado,contrato_enviado_em"
    )
    .eq("orcamento_id", orc.data.id)
    .maybeSingle();
  if (apr.error) throw apr.error;
  console.log("aprovacao_antes", apr.data);
  if (!apr.data) {
    console.error("Aprovação não encontrada.");
    process.exit(1);
  }

  const ctrRes = await sb
    .from("cliente_contratos")
    .select(
      "id,numero,status,orcamento_id,cliente_id,boleto_pago,boleto_pago_em,boleto_vencimento,liberado_para_agendamento,contrato_assinado_em,contrato_enviado_em"
    )
    .eq("orcamento_id", orc.data.id);
  if (ctrRes.error) throw ctrRes.error;
  console.log("contratos_antes", ctrRes.data);

  if (!ctrRes.data?.length) {
    console.error("Nenhum contrato vinculado a este orçamento.");
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

  console.log("sync_payload", syncPayload);

  const update: Record<string, unknown> = {
    status: syncPayload.status,
    contrato_enviado_em: syncPayload.contrato_enviado_em,
    contrato_assinado_em: syncPayload.contrato_assinado_em,
    boleto_vencimento: syncPayload.boleto_vencimento,
    boleto_pago: syncPayload.boleto_pago,
    boleto_pago_em: syncPayload.boleto_pago_em,
    liberado_para_agendamento: syncPayload.liberado_para_agendamento,
    updated_at: new Date().toISOString(),
  };
  if (syncPayload.data_inicio) update.data_inicio = syncPayload.data_inicio;
  if (syncPayload.data_fim) update.data_fim = syncPayload.data_fim;
  if (syncPayload.tipo_contrato) update.tipo_contrato = syncPayload.tipo_contrato;

  for (const ctr of ctrRes.data) {
    if (ctr.status === "encerrado" || ctr.status === "cancelado") {
      console.log("pulando contrato", ctr.numero, ctr.status);
      continue;
    }
    const { data: updated, error } = await sb
      .from("cliente_contratos")
      .update(update)
      .eq("id", ctr.id)
      .select(
        "id,numero,status,boleto_pago,liberado_para_agendamento,data_inicio,data_fim"
      )
      .single();
    if (error) throw error;
    console.log("contrato_depois", updated);

    const clienteId = ctr.cliente_id as string;
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
    console.log("cliente_depois", clAfter.error?.message ?? clAfter.data);
  }

  console.log("ok: correção pontual", NUMERO);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
