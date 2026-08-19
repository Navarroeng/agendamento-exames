import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel de Riscos Psicossociais | Navarro Engenharia",
  description:
    "Acompanhe a avaliação de riscos psicossociais da sua empresa.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
