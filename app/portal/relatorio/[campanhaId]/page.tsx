import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";
import { PortalRelatorioPrintView } from "@/components/portal-cliente/PortalRelatorioPrintView";

export default function PortalRelatorioPage({
  params,
}: {
  params: { campanhaId: string };
}) {
  return (
    <PerfilRouteGuard>
      <PortalRelatorioPrintView campanhaId={params.campanhaId} />
    </PerfilRouteGuard>
  );
}
