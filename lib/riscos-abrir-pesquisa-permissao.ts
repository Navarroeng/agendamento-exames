import { isPerfilAdmin, type PerfilUsuarioTipo } from "@/lib/permissions";

/**
 * E-mails persistidos em `perfis_usuarios.email` (único) das usuárias
 * operacionais autorizadas a abrir pesquisa. Não usar o nome exibido.
 */
export const RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS = [
  "bruna@navarro.com.br",
  "rafaela@navarro.com.br",
  "assessoria@navarroeng.com.br",
] as const;

export const RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG =
  "Você não possui permissão para abrir esta pesquisa.";

export function normalizeEmailPermissao(
  email: string | null | undefined
): string {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

export function isEmailAutorizadoAbrirPesquisaRiscos(
  email: string | null | undefined
): boolean {
  const normalized = normalizeEmailPermissao(email);
  if (!normalized) return false;
  return (RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS as readonly string[]).includes(
    normalized
  );
}

/**
 * Abrir pesquisa: administradores (perfil) ou e-mails da allowlist operacional.
 * Não libera outras ações administrativas.
 */
export function podeAbrirPesquisaRiscos(input: {
  perfil?: PerfilUsuarioTipo | null;
  email?: string | null;
  emailAuth?: string | null;
}): boolean {
  if (isPerfilAdmin(input.perfil)) return true;
  return (
    isEmailAutorizadoAbrirPesquisaRiscos(input.email) ||
    isEmailAutorizadoAbrirPesquisaRiscos(input.emailAuth)
  );
}
