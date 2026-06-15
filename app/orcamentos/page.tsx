import { OrcamentosPage } from "@/components/orcamentos/OrcamentosPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function Orcamentos() {
  return (
    <PerfilRouteGuard>
      <OrcamentosPage />
    </PerfilRouteGuard>
  );
}
