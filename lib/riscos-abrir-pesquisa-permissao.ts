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

/** Domínios corporativos equivalentes no login da Navarro. */
const DOMINIOS_CORPORATIVOS_EQUIVALENTES = [
  "navarro.com.br",
  "navarroeng.com.br",
] as const;

/**
 * Candidatos de comparação: e-mail normalizado + o par corporativo
 * navarro.com.br ↔ navarroeng.com.br (mesmo local-part).
 */
export function emailsCandidatosPermissaoRiscos(
  email: string | null | undefined
): string[] {
  const normalized = normalizeEmailPermissao(email);
  if (!normalized) return [];
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return [normalized];
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (
    !(DOMINIOS_CORPORATIVOS_EQUIVALENTES as readonly string[]).includes(domain)
  ) {
    return [normalized];
  }
  return DOMINIOS_CORPORATIVOS_EQUIVALENTES.map((d) => `${local}@${d}`);
}

export function isEmailAutorizadoAbrirPesquisaRiscos(
  email: string | null | undefined
): boolean {
  const allow = RISCOS_ABRIR_PESQUISA_EMAILS_PERMITIDOS as readonly string[];
  return emailsCandidatosPermissaoRiscos(email).some((candidato) =>
    allow.includes(candidato)
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
