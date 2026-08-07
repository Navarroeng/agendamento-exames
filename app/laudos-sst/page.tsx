import { LaudosSstPage } from "@/components/laudos-sst/LaudosSstPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function LaudosSstRoute() {
  return (
    <PerfilRouteGuard>
      <LaudosSstPage />
    </PerfilRouteGuard>
  );
}
