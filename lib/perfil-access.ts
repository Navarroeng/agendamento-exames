import type { NavSection } from "@/lib/constants";
import type { PerfilUsuarioTipo } from "@/lib/types";

export {
  canAccessPath,
  isDeniedPath,
  PROFILE_PERMISSIONS,
  SEM_PERMISSAO_PATH,
} from "./permissions";
export type { ProfilePermissionConfig } from "./permissions";

import { canAccessPath, PROFILE_PERMISSIONS } from "./permissions";

function getPermissionsForPerfil(
  perfil: PerfilUsuarioTipo | null | undefined
) {
  if (!perfil) return PROFILE_PERMISSIONS.operacional;
  return PROFILE_PERMISSIONS[perfil] ?? PROFILE_PERMISSIONS.operacional;
}

export function filterNavItemsByPerfil<
  T extends { label: string; href: string | null },
>(items: readonly T[], perfil: PerfilUsuarioTipo | null | undefined): T[] {
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
