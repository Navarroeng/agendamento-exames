import type { Metadata } from "next";
import { RedefinirSenhaPage } from "@/components/auth/RedefinirSenhaPage";

export const metadata: Metadata = {
  title: "Redefinir senha | Navarro Engenharia",
};

export default function RedefinirSenha() {
  return <RedefinirSenhaPage />;
}
