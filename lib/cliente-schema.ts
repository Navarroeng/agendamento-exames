/**
 * Schema real de public.clientes (Supabase).
 * Confirmado via REST/OpenAPI em 2026-06-09.
 *
 * Colunas existentes:
 * - id (uuid)
 * - nome (text) — razão social / nome da empresa
 * - cnpj (text)
 * - contato (text, nullable) — legado, não usado no app
 * - telefone (text, nullable) — legado, não usado no app
 * - email (text, nullable) — legado, não usado no app
 * - created_at (timestamptz)
 * - cnpj_digits (text, generated) — CNPJ só com dígitos; índice único (migration 031)
 * - procuracao (text) — ativa | inativa (migration 033)
 */
export const CLIENTE_DB_COLUMNS =
  "id, nome, cnpj, procuracao, created_at" as const;

/** Colunas para busca normalizada (inclui contatos legados). */
export const CLIENTE_LIST_COLUMNS =
  "id, nome, cnpj, procuracao, email, telefone, contato, created_at" as const;

/** Colunas mínimas para selects e autocompletes (carrega todos os clientes). */
export const CLIENTE_SELECT_COLUMNS = "id, nome, cnpj, procuracao" as const;
