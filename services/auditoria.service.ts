import {
  AUDITORIA_ACOES,
  AUDITORIA_MODULOS,
  type AuditoriaAcao,
  type AuditoriaFilters,
  type AuditoriaModulo,
  type AuditoriaUsuarioContext,
  mapHistoricoAcaoToAuditoria,
  type RegistrarAuditoriaInput,
} from "@/lib/auditoria";
import { createClient } from "@/lib/supabase/client";
import type { AuditoriaRecord } from "@/lib/types";

export async function registrarAuditoria(
  input: RegistrarAuditoriaInput
): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from("auditoria_sistema").insert({
      usuario_id: input.usuarioId ?? null,
      usuario_nome: input.usuarioNome.trim(),
      usuario_email: input.usuarioEmail.trim(),
      modulo: input.modulo,
      acao: input.acao,
      registro_id: input.registroId ?? null,
      registro_nome: input.registroNome?.trim() || null,
      descricao: input.descricao.trim(),
      dados_antes: input.dadosAntes ?? null,
      dados_depois: input.dadosDepois ?? null,
    });

    if (error) {
      console.error("[auditoria] Falha ao registrar evento:", error);
    }
  } catch (err) {
    console.error("[auditoria] Falha ao registrar evento:", err);
  }
}

export async function syncHistoricoEntriesToAuditoria(
  context: AuditoriaUsuarioContext | undefined,
  modulo: AuditoriaModulo,
  registroId: string,
  registroNome: string | null | undefined,
  entries: { acao: string; detalhes: string }[]
): Promise<void> {
  if (entries.length === 0) return;

  const usuarioNome = context?.usuarioNome ?? "Sistema";
  const usuarioEmail = context?.usuarioEmail ?? "";

  await Promise.all(
    entries.map((entry) =>
      registrarAuditoria({
        usuarioId: context?.usuarioId ?? null,
        usuarioNome,
        usuarioEmail,
        modulo,
        acao: mapHistoricoAcaoToAuditoria(entry.acao),
        registroId,
        registroNome,
        descricao: entry.detalhes,
      })
    )
  );
}

export interface ListarAuditoriaParams {
  page?: number;
  pageSize?: number;
  filters?: Partial<AuditoriaFilters>;
}

export interface ListarAuditoriaResult {
  records: AuditoriaRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const LIST_COLUMNS =
  "id, usuario_nome, usuario_email, modulo, acao, registro_id, registro_nome, descricao, created_at";

export async function listarAuditoriaPaginada(
  params: ListarAuditoriaParams = {}
): Promise<ListarAuditoriaResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 50;
  const filters = params.filters ?? {};
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = createClient();
  let query = supabase
    .from("auditoria_sistema")
    .select(LIST_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.dataInicio) {
    query = query.gte("created_at", `${filters.dataInicio}T00:00:00`);
  }
  if (filters.dataFim) {
    query = query.lte("created_at", `${filters.dataFim}T23:59:59.999`);
  }
  if (filters.usuarioEmail) {
    query = query.eq("usuario_email", filters.usuarioEmail);
  }
  if (filters.modulo) {
    query = query.eq("modulo", filters.modulo);
  }
  if (filters.acao) {
    query = query.eq("acao", filters.acao);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    records: (data ?? []) as AuditoriaRecord[],
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function listarAuditoriaUsuariosFiltro(
  limit = 100
): Promise<Array<{ email: string; nome: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("auditoria_sistema")
    .select("usuario_email, usuario_nome")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const map = new Map<string, string>();
  (data ?? []).forEach((row) => {
    const email = String(row.usuario_email ?? "").trim();
    const nome = String(row.usuario_nome ?? "").trim();
    if (email && !map.has(email)) map.set(email, nome || email);
  });

  return Array.from(map.entries())
    .map(([email, nome]) => ({ email, nome }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function moduloAuditoriaFromFaturaTipo(
  tipo: "cliente" | "clinica"
): typeof AUDITORIA_MODULOS.faturas_clientes | typeof AUDITORIA_MODULOS.custos_clinicas {
  return tipo === "cliente"
    ? AUDITORIA_MODULOS.faturas_clientes
    : AUDITORIA_MODULOS.custos_clinicas;
}

export { AUDITORIA_ACOES, AUDITORIA_MODULOS };
export type { AuditoriaAcao, AuditoriaModulo, AuditoriaUsuarioContext };
