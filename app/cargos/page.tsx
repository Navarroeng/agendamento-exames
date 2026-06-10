import { CargosPage } from "@/components/cargos/CargosPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function Cargos() {
  return (
    <PerfilRouteGuard>
      <CargosPage />
    </PerfilRouteGuard>
  );
}
