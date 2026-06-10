import { ExamesPage } from "@/components/exames/ExamesPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function Exames() {
  return (
    <PerfilRouteGuard>
      <ExamesPage />
    </PerfilRouteGuard>
  );
}
