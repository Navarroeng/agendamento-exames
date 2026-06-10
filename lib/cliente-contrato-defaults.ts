import type { ClienteContratoFormValues } from "@/lib/types";

export function getEmptyClienteContratoForm(): ClienteContratoFormValues {
  return {
    data_inicio: "",
    data_fim: "",
    quantidade_colaboradores: "",
    valor_contrato: "",
    condicao_pagamento: "",
    tipo_contrato: "anual",
    reajuste_percentual: "",
    observacoes: "",
    status: "ativo",
  };
}
