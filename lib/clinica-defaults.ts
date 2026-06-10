import type { ClinicaFormValues } from "@/lib/types";

export function getEmptyClinicaForm(): ClinicaFormValues {
  return {
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    responsavel: "",
    telefone: "",
    whatsapp: "",
    email: "",
    site: "",
    cep: "",
    rua: "",
    numero: "",
    bairro: "",
    cidade: "",
    estado: "",
    forma_pagamento: "",
    prazo_pagamento: "",
    observacoes_financeiras: "",
    horario_atendimento: "",
    possui_coleta: "Não",
    possui_sistema_online: "Não",
    exames_atendidos: "",
    observacoes: "",
    status: "Ativa",
  };
}
