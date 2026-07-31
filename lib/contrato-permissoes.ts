import { isPerfilAdmin, type PerfilUsuarioTipo } from "@/lib/permissions";

export const CONTRATO_ENCERRAR_SEM_PERMISSAO_MSG =
  "Você não possui permissão para encerrar este contrato. Esta ação é exclusiva para administradores.";

export const ORCAMENTO_COM_CONTRATO_USE_ENCERRAR_MSG =
  "Este orçamento possui contrato. Utilize a ação Encerrar contrato.";

/**
 * Normaliza o perfil persistido (`admin`) e aliases oficiais (ADM / Admin / Administrador).
 */
export function normalizePerfilUsuario(
  perfil: PerfilUsuarioTipo | null | undefined
): string {
  const raw = String(perfil ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (raw === "admin" || raw === "adm" || raw === "administrador") {
    return "admin";
  }
  return raw;
}

/** Encerrar/cancelar contrato (e orçamento já convertido) — só administrador. */
export function podeEncerrarContrato(
  perfil: PerfilUsuarioTipo | null | undefined
): boolean {
  if (normalizePerfilUsuario(perfil) === "admin") return true;
  return isPerfilAdmin(perfil);
}
