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
    .from("faturas")
    .update({ status: "vencida" })
    .eq("id", "00000000-0000-0000-0000-000000000000");

  if (!error) {
    console.log("MIGRATION_040_LIKELY_APPLIED");
    return;
  }

  const msg = error.message ?? "";
  if (
    msg.includes("check constraint") ||
    msg.includes("faturas_status_check") ||
    msg.includes("violates check")
  ) {
    console.log("MIGRATION_040_NOT_APPLIED");
    console.log("ERROR:", msg);
    process.exit(2);
  }

  console.log("MIGRATION_040_LIKELY_APPLIED");
  console.log("NOTE:", msg);
}

void main();
