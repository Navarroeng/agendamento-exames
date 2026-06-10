import { SIM_NAO } from "@/lib/constants";
import type { ClinicaFormValues, ClinicaRecord } from "@/lib/types";

function boolToSimNao(value: boolean): string {
  return value ? SIM_NAO[1] : SIM_NAO[0];
}

function simNaoToBool(value: string): boolean {
  return value === "Sim";
}

function statusToForm(status: string): string {
  return status === "inativa" ? "Inativa" : "Ativa";
}

function statusFromForm(value: string): "ativa" | "inativa" {
  return value === "Inativa" ? "inativa" : "ativa";
}

export function clinicaToFormValues(clinica: ClinicaRecord): ClinicaFormValues {
  return {
    razao_social: clinica.razao_social,
    nome_fantasia: clinica.nome_fantasia,
    cnpj: clinica.cnpj,
    responsavel: clinica.responsavel,
    telefone: clinica.telefone,
    whatsapp: clinica.whatsapp ?? "",
    email: clinica.email,
    site: clinica.site ?? "",
    cep: clinica.cep ?? "",
    rua: clinica.rua ?? "",
    numero: clinica.numero ?? "",
    bairro: clinica.bairro ?? "",
    cidade: clinica.cidade,
    estado: clinica.estado,
    forma_pagamento: clinica.forma_pagamento ?? "",
    prazo_pagamento: clinica.prazo_pagamento ?? "",
    observacoes_financeiras: clinica.observacoes_financeiras ?? "",
    horario_atendimento: clinica.horario_atendimento ?? "",
    possui_coleta: boolToSimNao(clinica.possui_coleta),
    possui_sistema_online: boolToSimNao(clinica.possui_sistema_online),
    exames_atendidos: clinica.exames_atendidos ?? "",
    observacoes: clinica.observacoes ?? "",
    status: statusToForm(clinica.status),
  };
}

export function formValuesToClinicaInsert(
  form: ClinicaFormValues
): Omit<ClinicaRecord, "id" | "created_at" | "updated_at"> {
  return {
    razao_social: form.razao_social.trim(),
    nome_fantasia: form.nome_fantasia.trim(),
    cnpj: form.cnpj.trim(),
    responsavel: form.responsavel.trim(),
    telefone: form.telefone.trim(),
    whatsapp: form.whatsapp.trim() || null,
    email: form.email.trim(),
    site: form.site.trim() || null,
    cep: form.cep.trim() || null,
    rua: form.rua.trim() || null,
    numero: form.numero.trim() || null,
    bairro: form.bairro.trim() || null,
    cidade: form.cidade.trim(),
    estado: form.estado.trim(),
    forma_pagamento: form.forma_pagamento.trim() || null,
    prazo_pagamento: form.prazo_pagamento.trim() || null,
    observacoes_financeiras: form.observacoes_financeiras.trim() || null,
    horario_atendimento: form.horario_atendimento.trim() || null,
    possui_coleta: simNaoToBool(form.possui_coleta),
    possui_sistema_online: simNaoToBool(form.possui_sistema_online),
    exames_atendidos: form.exames_atendidos.trim() || null,
    observacoes: form.observacoes.trim() || null,
    status: statusFromForm(form.status),
  };
}

export function countExamesAtendidos(examesAtendidos: string | null): number {
  if (!examesAtendidos?.trim()) return 0;
  return examesAtendidos
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;
}
