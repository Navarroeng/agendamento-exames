import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";
import { CobrancasPage } from "@/components/cobrancas/CobrancasPage";

export default function Cobrancas() {
  return (
    <PerfilRouteGuard>
      <CobrancasPage />
    </PerfilRouteGuard>
  );
}
