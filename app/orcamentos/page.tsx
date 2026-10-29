import { OrcamentosPage } from "@/components/orcamentos/OrcamentosPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";
import { Suspense } from "react";

export default function Orcamentos() {
  return (
    <PerfilRouteGuard>
      <Suspense fallback={null}>
        <OrcamentosPage />
      </Suspense>
    </PerfilRouteGuard>
  );
}
