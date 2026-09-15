import { RESPONSAVEIS } from "@/lib/constants";
import {
  isPerfilAdmin,
  isPerfilStaffNavarro,
  type PerfilUsuarioTipo,
} from "@/lib/permissions";
import { normalizePerfilUsuario } from "@/lib/contrato-permissoes";
import type { OrcamentoStatus } from "@/lib/orcamento-types";
import { formatUppercaseDisplay } from "@/lib/text-normalize";

export const ORCAMENTO_RESPONSAVEL_BLOQUEADO_MSG =
  "Não é possível alterar o responsável de um processo cancelado ou encerrado.";

export const ORCAMENTO_RESPONSAVEL_SEM_PERMISSAO_MSG =
  "Você não possui permissão para alterar o responsável deste processo.";

export function statusPermiteAlterarResponsavel(
  status: OrcamentoStatus
): boolean {
  return status !== "cancelado" && status !== "contrato_encerrado";
}

function normalizeNome(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Admin ou trio operacional cadastrado (`RESPONSAVEIS`).
 * Não depende de e-mail, criador do orçamento nem responsável atual.
 */
export function isGrupoOperacionalAlterarResponsavel(
  perfil: PerfilUsuarioTipo | null | undefined,
  nome: string | null | undefined
): boolean {
  if (
    normalizePerfilUsuario(perfil) === "admin" ||
    isPerfilAdmin(perfil)
  ) {
    return true;
  }
  if (!isPerfilStaffNavarro(perfil)) return false;
  const normalized = normalizeNome(nome);
  if (!normalized) return false;
  const primeiro = normalized.split(/\s+/)[0] ?? "";
  return (RESPONSAVEIS as readonly string[]).some((permitido) => {
    const alvo = normalizeNome(permitido);
    return normalized === alvo || primeiro === alvo;
  });
}

/** Quem pode abrir/confirmar a transferência do processo. */
export function podeAlterarResponsavelProcesso(params: {
  perfil: PerfilUsuarioTipo | null | undefined;
  usuarioId?: string | null | undefined;
  usuarioNome: string | null | undefined;
  orcamento: {
    status: OrcamentoStatus;
    responsavel: string;
    responsavel_user_id?: string | null;
  };
}): boolean {
  if (!statusPermiteAlterarResponsavel(params.orcamento.status)) {
    return false;
  }
  return isGrupoOperacionalAlterarResponsavel(
    params.perfil,
    params.usuarioNome
  );
}

/** Nome do responsável do orçamento para exibição (sempre maiúsculas). */
export function formatResponsavelOrcamentoDisplay(
  value: string | null | undefined
): string {
  return formatUppercaseDisplay(value);
}

export function formatCriadoPorOrcamento(
  orcamento: {
    criado_por?: string | null;
    responsavel: string;
  }
): string {
  const criado = orcamento.criado_por?.trim();
  if (criado) return formatUppercaseDisplay(criado);
  return formatUppercaseDisplay(orcamento.responsavel);
}
