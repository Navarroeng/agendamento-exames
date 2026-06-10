import type { ClienteFormValues } from "@/lib/types";

export function getEmptyClienteForm(): ClienteFormValues {
  return {
    nome: "",
    cnpj: "",
  };
}
