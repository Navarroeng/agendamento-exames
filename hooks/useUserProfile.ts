"use client";

export {
  useAuth as useUserProfile,
  useHistoricoUsuario,
} from "@/contexts/AuthContext";
export { filterNavItemsByPerfil, canAccessPath } from "@/lib/perfil-access";
