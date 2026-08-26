import { Suspense } from "react";
import { ESocialPage } from "@/components/esocial/ESocialPage";

export default function ESocial() {
  return (
    <Suspense fallback={null}>
      <ESocialPage />
    </Suspense>
  );
}
