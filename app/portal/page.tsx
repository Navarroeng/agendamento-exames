import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";
import { PortalHome } from "@/components/portal-cliente/PortalHome";
import { IconUsers } from "@/components/ui/icons/OutlineIcons";

export default function PortalPage() {
  return (
    <PerfilRouteGuard>
      <AppShell
        title="Portal do Cliente"
        subtitle="Pré-visualização interna do Portal SST do cliente."
        icon={<IconUsers size={20} />}
      >
        <Suspense
          fallback={
            <p className="py-16 text-center text-sm text-app-muted">
              Carregando portal...
            </p>
          }
        >
          <PortalHome />
        </Suspense>
      </AppShell>
    </PerfilRouteGuard>
  );
}
