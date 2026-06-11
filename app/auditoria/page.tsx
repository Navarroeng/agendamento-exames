import { AuditoriaPage } from "@/components/auditoria/AuditoriaPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function Auditoria() {
  return (
    <PerfilRouteGuard>
      <AuditoriaPage />
    </PerfilRouteGuard>
  );
}
