import { UsuariosPage } from "@/components/usuarios/UsuariosPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function Usuarios() {
  return (
    <PerfilRouteGuard>
      <UsuariosPage />
    </PerfilRouteGuard>
  );
}
