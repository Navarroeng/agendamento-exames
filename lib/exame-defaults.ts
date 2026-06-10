import type { ExameCatalogFormValues } from "@/lib/types";

export function getEmptyExameCatalogForm(): ExameCatalogFormValues {
  return {
    nome: "",
    valor_navarro: "",
    ativo: "Ativo",
  };
}
