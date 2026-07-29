import { ImplantacaoClientesPage } from "@/components/implantacao/ImplantacaoClientesPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function Implantacao() {
  return (
    <PerfilRouteGuard>
      <ImplantacaoClientesPage />
    </PerfilRouteGuard>
  );
}
