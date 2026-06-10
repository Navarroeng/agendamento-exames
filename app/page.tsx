import { Suspense } from "react";
import { AgendamentoPage } from "@/components/agendamentos/AgendamentoPage";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <AgendamentoPage />
    </Suspense>
  );
}