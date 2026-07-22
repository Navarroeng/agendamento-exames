/** Relatório de recibos e-Social duplicados no banco (antes da migration 044). */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { normalizeEsocialReciboForCompare } from "../lib/esocial-recibo";

function loadEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const env: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

interface AgendamentoReciboRow {
  id: string;
  cliente_nome: string;
  colaborador: string;
  data_agendamento: string;
  aso: string;
  data_envio_esocial: string | null;
  esocial_recibo: string | null;
  esocial_recibo_normalizado?: string | null;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("MISSING_ENV");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("agendamentos")
    .select(
      "id, cliente_nome, colaborador, data_agendamento, aso, data_envio_esocial, esocial_recibo, esocial_recibo_normalizado"
    )
    .not("esocial_recibo", "is", null);

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("esocial_recibo_normalizado")) {
      const fallback = await supabase
        .from("agendamentos")
        .select(
          "id, cliente_nome, colaborador, data_agendamento, aso, data_envio_esocial, esocial_recibo"
        )
        .not("esocial_recibo", "is", null);
      if (fallback.error) {
        console.error("CHECK_FAILED:", fallback.error.message);
        process.exit(3);
      }
      reportDuplicates((fallback.data ?? []) as AgendamentoReciboRow[]);
      return;
    }
    console.error("CHECK_FAILED:", msg);
    process.exit(3);
  }

  reportDuplicates((data ?? []) as AgendamentoReciboRow[]);
}

function reportDuplicates(rows: AgendamentoReciboRow[]) {
  const groups = new Map<string, AgendamentoReciboRow[]>();

  for (const row of rows) {
    const normalized =
      row.esocial_recibo_normalizado ??
      normalizeEsocialReciboForCompare(row.esocial_recibo);
    if (!normalized) continue;

    const list = groups.get(normalized) ?? [];
    list.push(row);
    groups.set(normalized, list);
  }

  const duplicates = Array.from(groups.entries()).filter(
    ([, list]) => list.length > 1
  );

  if (duplicates.length === 0) {
    console.log("NENHUM_DUPLICADO");
    console.log(
      "Migration 044 pode ser aplicada: nenhum recibo e-Social duplicado encontrado."
    );
    return;
  }

  console.log(`DUPLICADOS_ENCONTRADOS: ${duplicates.length} grupo(s)\n`);

  for (const [recibo, list] of duplicates) {
    console.log(`Recibo normalizado: ${recibo}`);
    for (const row of list) {
      console.log(
        `  - id=${row.id} | ${row.cliente_nome} | ${row.colaborador} | exame=${row.data_agendamento} | ASO=${row.aso} | recibo=${row.esocial_recibo}`
      );
    }
    console.log("");
  }

  console.log(
    "Corrija manualmente os duplicados acima antes de aplicar supabase/migrations/044_esocial_recibo_unico.sql"
  );
  process.exit(2);
}

void main();
