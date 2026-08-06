/**
 * Diagnóstico somente leitura: bloqueios manuais sobrescritos.
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

type AuditRow = {
  id: string;
  created_at: string;
  acao: string;
  registro_id: string | null;
  registro_nome: string | null;
  descricao: string | null;
  usuario_nome: string | null;
  dados_antes: unknown;
  dados_depois: unknown;
};

type ClienteRow = {
  id: string;
  nome: string;
  cnpj: string;
  disponivel_agendamento: boolean;
  origem_cadastro: string | null;
  updated_at: string | null;
};

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const sb = createClient(url, key);

  const acaoBloqueio = "agendamento_cliente_bloqueado";
  const acaoLiberacao = "agendamento_cliente_liberado";

  // Busca eventos de bloqueio (paginado)
  const bloqueios: AuditRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("auditoria_sistema")
      .select(
        "id, created_at, acao, registro_id, registro_nome, descricao, usuario_nome, dados_antes, dados_depois"
      )
      .eq("acao", acaoBloqueio)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    const rows = (data ?? []) as AuditRow[];
    bloqueios.push(...rows);
    if (rows.length < 1000) break;
  }

  const liberacoes: AuditRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb
      .from("auditoria_sistema")
      .select(
        "id, created_at, acao, registro_id, registro_nome, descricao, usuario_nome, dados_antes, dados_depois"
      )
      .eq("acao", acaoLiberacao)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    const rows = (data ?? []) as AuditRow[];
    liberacoes.push(...rows);
    if (rows.length < 1000) break;
  }

  console.log("=== RESUMO AUDITORIA ===");
  console.log("total_bloqueios", bloqueios.length);
  console.log("total_liberacoes", liberacoes.length);

  const bloqueiosDia = bloqueios.filter((b) =>
    String(b.created_at).startsWith("2026-07-22")
  );
  console.log("bloqueios_2026-07-22", bloqueiosDia.length);

  // Último bloqueio por cliente sem liberação posterior
  const lastBloqueioById = new Map<string, AuditRow>();
  for (const b of bloqueios) {
    if (!b.registro_id) continue;
    const prev = lastBloqueioById.get(b.registro_id);
    if (!prev || prev.created_at < b.created_at) {
      lastBloqueioById.set(b.registro_id, b);
    }
  }

  const liberacoesById = new Map<string, AuditRow[]>();
  for (const l of liberacoes) {
    if (!l.registro_id) continue;
    const list = liberacoesById.get(l.registro_id) ?? [];
    list.push(l);
    liberacoesById.set(l.registro_id, list);
  }

  const candidatos: Array<{
    clienteId: string;
    ultimoBloqueio: AuditRow;
    liberacaoPosterior: AuditRow | null;
  }> = [];

  for (const [clienteId, ultimoBloqueio] of Array.from(lastBloqueioById.entries())) {
    const libs = liberacoesById.get(clienteId) ?? [];
    const posterior =
      libs
        .filter((l) => l.created_at > ultimoBloqueio.created_at)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))[0] ?? null;
    if (!posterior) {
      candidatos.push({
        clienteId,
        ultimoBloqueio,
        liberacaoPosterior: null,
      });
    }
  }

  console.log(
    "clientes_com_bloqueio_sem_liberacao_manual_posterior",
    candidatos.length
  );

  const ids = candidatos.map((c) => c.clienteId);
  const clientes: ClienteRow[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await sb
      .from("clientes")
      .select(
        "id, nome, cnpj, disponivel_agendamento, origem_cadastro, updated_at"
      )
      .in("id", chunk);
    if (error) throw error;
    clientes.push(...((data ?? []) as ClienteRow[]));
  }

  const byId = new Map(clientes.map((c) => [c.id, c]));

  const afetados = candidatos
    .map((c) => {
      const cli = byId.get(c.clienteId);
      return {
        id: c.clienteId,
        nome: cli?.nome ?? c.ultimoBloqueio.registro_nome,
        cnpj: cli?.cnpj ?? null,
        disponivel_atual: cli?.disponivel_agendamento ?? null,
        origem: cli?.origem_cadastro ?? null,
        updated_at: cli?.updated_at ?? null,
        bloqueado_em: c.ultimoBloqueio.created_at,
        bloqueado_por: c.ultimoBloqueio.usuario_nome,
        dados_depois_bloqueio: c.ultimoBloqueio.dados_depois,
        liberacao_manual_posterior: false,
        inconsistente:
          cli != null && cli.disponivel_agendamento === true,
      };
    })
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome)));

  const inconsistentes = afetados.filter((a) => a.inconsistente);
  const aindaBloqueados = afetados.filter(
    (a) => a.disponivel_atual === false
  );
  const naoEncontrados = afetados.filter((a) => a.disponivel_atual == null);

  console.log("=== ESTADO ATUAL ===");
  console.log("ainda_bloqueados_ok", aindaBloqueados.length);
  console.log("inconsistentes_liberados_sem_auditoria", inconsistentes.length);
  console.log("nao_encontrados", naoEncontrados.length);

  const campeao = afetados.filter((a) =>
    String(a.nome ?? "")
      .toUpperCase()
      .includes("CAMPE")
  );

  console.log("=== CAMPEÃO (qualquer variante) na lista restaurável ===");
  console.log("qtd", campeao.length);
  for (const c of campeao) {
    console.log(
      JSON.stringify({
        nome: c.nome,
        cnpj: c.cnpj,
        disponivel_atual: c.disponivel_atual,
        inconsistente: c.inconsistente,
        bloqueado_em: c.bloqueado_em,
        bloqueado_por: c.bloqueado_por,
      })
    );
  }

  console.log("=== INCONSISTENTES (bloqueio sem liberação, hoje liberado) ===");
  for (const c of inconsistentes) {
    console.log(
      JSON.stringify({
        nome: c.nome,
        cnpj: c.cnpj,
        disponivel_atual: c.disponivel_atual,
        origem: c.origem,
        updated_at: c.updated_at,
        bloqueado_em: c.bloqueado_em,
        bloqueado_por: c.bloqueado_por,
      })
    );
  }

  // Contratos liberados dos inconsistentes
  if (inconsistentes.length) {
    const { data: contratos, error } = await sb
      .from("cliente_contratos")
      .select(
        "id, cliente_id, orcamento_id, boleto_pago, liberado_para_agendamento, status"
      )
      .in(
        "cliente_id",
        inconsistentes.map((c) => c.id)
      );
    if (error) throw error;
    console.log("=== CONTRATOS DOS INCONSISTENTES ===");
    for (const ct of contratos ?? []) {
      console.log(JSON.stringify(ct));
    }
  }

  // Bloqueios do dia 22/07
  console.log("=== BLOQUEIOS 2026-07-22 ===");
  for (const b of bloqueiosDia) {
    const cli = byId.get(b.registro_id ?? "") ??
      clientes.find((c) => c.id === b.registro_id);
    console.log(
      JSON.stringify({
        created_at: b.created_at,
        nome: b.registro_nome,
        usuario: b.usuario_nome,
        registro_id: b.registro_id,
        disponivel_atual: cli?.disponivel_agendamento ?? byId.get(b.registro_id!)?.disponivel_agendamento,
      })
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
