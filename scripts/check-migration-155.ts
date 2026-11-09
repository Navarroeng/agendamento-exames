/**
 * Confirma se a coluna esocial_procuracao_pendente já existe.
 * Não altera registros.
 * Executar: npx tsx scripts/check-migration-155.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal(): Record<string, string> {
  const candidatos = [".env.local", "../agendamento-exames/.env.local"];
  for (const arquivo of candidatos) {
    try {
      const raw = readFileSync(arquivo, "utf8");
      const env: Record<string, string> = {};
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
      }
      if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        return env;
      }
    } catch {
      continue;
    }
  }
  return {};
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
  const { error } = await supabase
    .from("agendamentos")
    .select("esocial_procuracao_pendente")
    .limit(1);

  if (!error) {
    console.log("MIGRATION_155_APPLIED");
    return;
  }

  const msg = error.message ?? "";
  if (msg.toLowerCase().includes("esocial_procuracao_pendente")) {
    console.log("MIGRATION_155_NOT_APPLIED");
    process.exit(2);
  }

  console.log("MIGRATION_155_CHECK_INCONCLUSIVE");
  console.log("NOTE:", msg);
  process.exit(3);
}

void main();
