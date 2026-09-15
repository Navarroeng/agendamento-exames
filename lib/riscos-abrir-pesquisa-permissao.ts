import { isPerfilAdmin, type PerfilUsuarioTipo } from "@/lib/permissions";

/**
 * E-mails persistidos em `perfis_usuarios.email` (único) das usuárias
 * operacionais autorizadas a abrir pesquisa e a gerenciar participantes.
 * Não usar o nome exibido. Fonte única — não duplicar esta lista.
 */
export const RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS = [
  "bruna@navarro.com.br",
  "rafaela@navarro.com.br",
  "assessoria@navarroeng.com.br",
] as const;

export const RISCOS_ABRIR_PESQUISA_SEM_PERMISSAO_MSG =
  "Você não possui permissão para abrir esta pesquisa.";

export const RISCOS_GERENCIAR_PARTICIPANTE_SEM_PERMISSAO_MSG =
  "Você não possui permissão para gerenciar participantes desta pesquisa.";

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

type RiscosOperacionalAuthInput = {
  perfil?: PerfilUsuarioTipo | null;
  email?: string | null;
  emailAuth?: string | null;
};

function isAutorizadoOperacionalRiscos(input: RiscosOperacionalAuthInput): boolean {
  if (isPerfilAdmin(input.perfil)) return true;
  return (
    isEmailAutorizadoAbrirPesquisaRiscos(input.email) ||
    isEmailAutorizadoAbrirPesquisaRiscos(input.emailAuth)
  );
}

/**
 * Abrir pesquisa: administradores (perfil) ou e-mails da allowlist operacional.
 * Não libera outras ações administrativas (relatório, exclusão, encerrar, etc.).
 */
export function podeAbrirPesquisaRiscos(
  input: RiscosOperacionalAuthInput
): boolean {
  return isAutorizadoOperacionalRiscos(input);
}

/**
 * Editar/remover participante: o mesmo grupo de abrir/prorrogar/reabrir/período.
 * Não promove a admin e não altera PROFILE_PERMISSIONS.
 */
export function podeGerenciarParticipanteRiscos(
  input: RiscosOperacionalAuthInput
): boolean {
  return isAutorizadoOperacionalRiscos(input);
}
