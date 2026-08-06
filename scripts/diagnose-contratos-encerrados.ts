/**
 * Diagnóstico somente leitura: classificação de contratos encerrados.
 * Não altera dados.
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
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: contratos, error } = await sb
    .from("cliente_contratos")
    .select(
      "id, status, data_inicio, data_fim, encerrado_em, encerrado_por, motivo_encerramento, orcamento_id, numero"
    );

  if (error) {
    console.log("erro_contratos", error.message);
  } else {
    const rows = contratos ?? [];
    const byStatus = new Map<string, number>();
    for (const c of rows) {
      byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1);
    }
    console.log("=== cliente_contratos por status ===");
    for (const [k, v] of Array.from(byStatus.entries()).sort()) {
      console.log(k, v);
    }

    const encerrados = rows.filter((c) => c.status === "encerrado");
    const comEncerradoEm = encerrados.filter((c) => Boolean(c.encerrado_em));
    const semEncerradoEm = encerrados.filter((c) => !c.encerrado_em);
    const comMotivo = encerrados.filter((c) =>
      Boolean((c.motivo_encerramento ?? "").trim())
    );

    const hoje = new Date().toISOString().slice(0, 10);
    const naturalHeuristic = encerrados.filter((c) => {
      const fim = (c.data_fim ?? "").slice(0, 10);
      if (!fim) return false;
      // Heurística: sem encerrado_em e data_fim já passou OU encerrado_em próximo do data_fim
      if (!c.encerrado_em && fim <= hoje) return true;
      if (c.encerrado_em) {
        const em = String(c.encerrado_em).slice(0, 10);
        return em >= fim;
      }
      return false;
    });
    const antecipadoHeuristic = encerrados.filter((c) => {
      if (!c.encerrado_em) return false;
      const fim = (c.data_fim ?? "").slice(0, 10);
      const em = String(c.encerrado_em).slice(0, 10);
      if (!fim) return true; // manual sem fim claro
      return em < fim;
    });

    console.log("=== encerrados detalhe ===");
    console.log("total_encerrado", encerrados.length);
    console.log("com_encerrado_em_manual", comEncerradoEm.length);
    console.log("sem_encerrado_em_auto_ou_legado", semEncerradoEm.length);
    console.log("com_motivo", comMotivo.length);
    console.log("heuristica_fim_natural", naturalHeuristic.length);
    console.log("heuristica_antecipado", antecipadoHeuristic.length);
  }

  const { data: orcs, error: oerr } = await sb
    .from("orcamentos")
    .select("id, status");
  if (oerr) {
    console.log("erro_orcamentos", oerr.message);
  } else {
    const byStatus = new Map<string, number>();
    for (const o of orcs ?? []) {
      byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
    }
    console.log("=== orcamentos por status ===");
    for (const [k, v] of Array.from(byStatus.entries()).sort()) {
      console.log(k, v);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
