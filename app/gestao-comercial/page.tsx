import { GestaoComercialPage } from "@/components/gestao-comercial/GestaoComercialPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function GestaoComercialRoute() {
  return (
    <PerfilRouteGuard>
      <GestaoComercialPage />
    </PerfilRouteGuard>
  );
}
