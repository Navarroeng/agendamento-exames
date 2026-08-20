import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal do Cliente | Navarro Engenharia",
  description:
    "Portal SST para acompanhar serviços, avaliações e documentos da empresa.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
