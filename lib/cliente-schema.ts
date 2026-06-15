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
 */
export const CLIENTE_DB_COLUMNS =
  "id, nome, cnpj, created_at" as const;

/** Colunas mínimas para selects e autocompletes (carrega todos os clientes). */
export const CLIENTE_SELECT_COLUMNS = "id, nome, cnpj" as const;
