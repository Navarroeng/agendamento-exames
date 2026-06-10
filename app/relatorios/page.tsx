import { RelatoriosPage } from "@/components/relatorios/RelatoriosPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function Relatorios() {
  return (
    <PerfilRouteGuard>
      <RelatoriosPage />
    </PerfilRouteGuard>
  );
}
