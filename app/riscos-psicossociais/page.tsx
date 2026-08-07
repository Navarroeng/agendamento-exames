import { RiscosPsicossociaisPage } from "@/components/riscos-psicossociais/RiscosPsicossociaisPage";
import { PerfilRouteGuard } from "@/components/auth/PerfilRouteGuard";

export default function RiscosPsicossociaisRoute() {
  return (
    <PerfilRouteGuard>
      <RiscosPsicossociaisPage />
    </PerfilRouteGuard>
  );
}
