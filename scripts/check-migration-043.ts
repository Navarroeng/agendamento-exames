import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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
    .from("clientes")
    .select("disponivel_agendamento")
    .limit(1);

  if (!error) {
    console.log("MIGRATION_043_APPLIED");
    return;
  }

  const msg = error.message ?? "";
  if (msg.includes("disponivel_agendamento")) {
    console.log("MIGRATION_043_NOT_APPLIED");
    process.exit(2);
  }

  console.log("MIGRATION_043_CHECK_INCONCLUSIVE");
  console.log("NOTE:", msg);
  process.exit(3);
}

void main();
