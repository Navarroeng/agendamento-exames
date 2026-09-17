type PostgrestLikeError = {
  message?: string;
  details?: string;
  hint?: string;
};

/**
 * O cliente Supabase devolve `{ message, details, hint, code }` — não é `Error`.
 * Sem esta normalização, a UI cai no toast genérico da prévia.
 */
export function mensagemErroContratoDocumento(
  err: unknown,
  fallback: string
): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "object" && err !== null) {
    const e = err as PostgrestLikeError;
    const message = [e.message, e.details, e.hint]
      .map((part) => (typeof part === "string" ? part.trim() : ""))
      .filter(Boolean)
      .join(" — ");
    if (message) return message;
  }
  if (typeof err === "string" && err.trim()) return err.trim();
  return fallback;
}
