import { RESPONSAVEIS } from "@/lib/constants";
import {
  isPerfilAdmin,
  isPerfilStaffNavarro,
  type PerfilUsuarioTipo,
} from "@/lib/permissions";

/**
 * E-mails da allowlist operacional (legado). A autorização ativa do trio
 * Bruna/Rafaela/Karoline também usa `perfis_usuarios.nome` via `RESPONSAVEIS`.
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
  /** Nome persistido em `perfis_usuarios.nome` (Bruna, Rafaela, Karoline). */
  nome?: string | null;
};

function normalizeNomeOperacionalRiscos(
  value: string | null | undefined
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Trio operacional já cadastrado no produto (`RESPONSAVEIS`).
 * Compara o nome do perfil, não o e-mail de login.
 */
export function isNomeAutorizadoOperacionalRiscos(
  nome: string | null | undefined
): boolean {
  const normalized = normalizeNomeOperacionalRiscos(nome);
  if (!normalized) return false;
  const primeiro = normalized.split(/\s+/)[0] ?? "";
  return (RESPONSAVEIS as readonly string[]).some((permitido) => {
    const alvo = normalizeNomeOperacionalRiscos(permitido);
    return normalized === alvo || primeiro === alvo;
  });
}

function isAutorizadoOperacionalRiscos(input: RiscosOperacionalAuthInput): boolean {
  if (isPerfilAdmin(input.perfil)) return true;
  if (
    isEmailAutorizadoAbrirPesquisaRiscos(input.email) ||
    isEmailAutorizadoAbrirPesquisaRiscos(input.emailAuth)
  ) {
    return true;
  }
  return (
    isPerfilStaffNavarro(input.perfil) &&
    isNomeAutorizadoOperacionalRiscos(input.nome)
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
