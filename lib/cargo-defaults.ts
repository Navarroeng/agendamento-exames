import type { CargoFormValues } from "@/lib/types";

export function getEmptyCargoForm(): CargoFormValues {
  return {
    nome: "",
    descricao: "",
    ativo: "Ativo",
    validadePeriodicoMeses: "",
    exameIds: [],
  };
}
