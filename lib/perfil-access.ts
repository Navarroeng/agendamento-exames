import type { NavSection } from "@/lib/constants";
import type { PerfilUsuarioTipo } from "@/lib/types";

export const SEM_PERMISSAO_PATH = "/sem-permissao";

export type ProfilePermissionConfig = {
  fullAccess?: boolean;
  deniedPaths?: readonly string[];
};

/**
 * Permissões por perfil. Perfis com `fullAccess` acessam todas as rotas.
 * Demais perfis usam `deniedPaths` (prefixos bloqueados).
 */
export const PROFILE_PERMISSIONS: Record<string, ProfilePermissionConfig> = {
  admin: { fullAccess: true },
  operacional: {
    deniedPaths: ["/exames", "/relatorios", "/configuracoes"],
  },
};

const DEFAULT_PERMISSIONS: ProfilePermissionConfig =
  PROFILE_PERMISSIONS.operacional;

const PUBLIC_AUTHENTICATED_PATHS = new Set([SEM_PERMISSAO_PATH, "/login"]);

function getPermissionsForPerfil(
  perfil: PerfilUsuarioTipo | null | undefined
): ProfilePermissionConfig {
  if (!perfil) return DEFAULT_PERMISSIONS;
  return PROFILE_PERMISSIONS[perfil] ?? DEFAULT_PERMISSIONS;
}

export function isDeniedPath(
  pathname: string,
  deniedPaths: readonly string[]
): boolean {
  return deniedPaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function canAccessPath(
  perfil: PerfilUsuarioTipo | null | undefined,
  pathname: string
): boolean {
  if (PUBLIC_AUTHENTICATED_PATHS.has(pathname)) return true;

  const permissions = getPermissionsForPerfil(perfil);
  if (permissions.fullAccess) return true;

  const denied = permissions.deniedPaths ?? [];
  return !isDeniedPath(pathname, denied);
}

export function filterNavItemsByPerfil<T extends { label: string; href: string | null }>(
  items: readonly T[],
  perfil: PerfilUsuarioTipo | null | undefined
): T[] {
  return items.filter((item) => {
    if (!item.href) return getPermissionsForPerfil(perfil).fullAccess === true;
    return canAccessPath(perfil, item.href);
  });
}

export function filterNavSectionsByPerfil(
  sections: readonly NavSection[],
  perfil: PerfilUsuarioTipo | null | undefined
): NavSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: filterNavItemsByPerfil(section.items, perfil),
    }))
    .filter((section) => section.items.length > 0);
}
