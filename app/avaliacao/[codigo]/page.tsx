import type { Metadata } from "next";
import { AvaliacaoPortal } from "@/components/avaliacao/AvaliacaoPortal";

export const metadata: Metadata = {
  title: "Pesquisa Psicossocial | Navarro Engenharia",
  description:
    "Portal do colaborador para resposta à Pesquisa de Riscos Psicossociais.",
};

export default function AvaliacaoPage({
  params,
}: {
  params: { codigo: string };
}) {
  return <AvaliacaoPortal codigo={params.codigo} />;
}
