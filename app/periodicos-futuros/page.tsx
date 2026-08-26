import { Suspense } from "react";
import { PeriodicosFuturosPage } from "@/components/periodicos-futuros/PeriodicosFuturosPage";

export default function PeriodicosFuturos() {
  return (
    <Suspense fallback={null}>
      <PeriodicosFuturosPage />
    </Suspense>
  );
}
