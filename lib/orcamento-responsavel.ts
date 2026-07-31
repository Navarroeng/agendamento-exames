import { isPerfilAdmin, type PerfilUsuarioTipo } from "@/lib/permissions";
import { normalizePerfilUsuario } from "@/lib/contrato-permissoes";
import type { OrcamentoStatus } from "@/lib/orcamento-types";

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

/** Quem pode abrir/confirmar a transferência do processo. */
export function podeAlterarResponsavelProcesso(params: {
  perfil: PerfilUsuarioTipo | null | undefined;
  usuarioId: string | null | undefined;
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
  if (
    normalizePerfilUsuario(params.perfil) === "admin" ||
    isPerfilAdmin(params.perfil)
  ) {
    return true;
  }

  const responsavelUserId = params.orcamento.responsavel_user_id ?? null;
  if (responsavelUserId && params.usuarioId) {
    return responsavelUserId === params.usuarioId;
  }

  return (
    normalizeNome(params.orcamento.responsavel) ===
    normalizeNome(params.usuarioNome)
  );
}

export function formatCriadoPorOrcamento(
  orcamento: {
    criado_por?: string | null;
    responsavel: string;
  }
): string {
  const criado = orcamento.criado_por?.trim();
  if (criado) return criado;
  return orcamento.responsavel?.trim() || "—";
}
