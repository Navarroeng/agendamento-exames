import { normalizeUppercaseField } from "@/lib/text-normalize";
import { SIM_NAO } from "@/lib/constants";
import {
  formatDiasAtendimentoForm,
  janelasAdicionaisToJson,
  normalizeHorario,
  parseDiasAtendimentoForm,
  tipoAtendimentoFromForm,
  tipoAtendimentoToForm,
} from "@/lib/clinica-regras-atendimento";
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
    tipo_atendimento: tipoAtendimentoToForm(clinica.tipo_atendimento),
    dias_atendimento: formatDiasAtendimentoForm(clinica.dias_atendimento),
    horario_padrao_inicio: normalizeHorario(clinica.horario_padrao_inicio),
    horario_padrao_fim: normalizeHorario(clinica.horario_padrao_fim),
    horario_clinico_inicio: normalizeHorario(clinica.horario_clinico_inicio),
    horario_clinico_fim: normalizeHorario(clinica.horario_clinico_fim),
    horario_complementar_inicio: normalizeHorario(clinica.horario_complementar_inicio),
    horario_complementar_fim: normalizeHorario(clinica.horario_complementar_fim),
    janela_adicional_inicio: normalizeHorario(clinica.janelas_adicionais?.[0]?.inicio),
    janela_adicional_fim: normalizeHorario(clinica.janelas_adicionais?.[0]?.fim),
    observacao_operacional: clinica.observacao_operacional ?? "",
  };
}

export function formValuesToClinicaInsert(
  form: ClinicaFormValues
): Omit<ClinicaRecord, "id" | "created_at" | "updated_at"> {
  return {
    razao_social: normalizeUppercaseField(form.razao_social),
    nome_fantasia: normalizeUppercaseField(form.nome_fantasia),
    cnpj: form.cnpj.trim(),
    responsavel: normalizeUppercaseField(form.responsavel),
    telefone: form.telefone.trim(),
    whatsapp: form.whatsapp.trim() || null,
    email: form.email.trim(),
    site: form.site.trim() || null,
    cep: form.cep.trim() || null,
    rua: normalizeUppercaseField(form.rua) || null,
    numero: form.numero.trim() || null,
    bairro: normalizeUppercaseField(form.bairro) || null,
    cidade: normalizeUppercaseField(form.cidade),
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
    tipo_atendimento: tipoAtendimentoFromForm(form.tipo_atendimento),
    dias_atendimento: (() => {
      const dias = parseDiasAtendimentoForm(form.dias_atendimento);
      return dias.length ? dias : null;
    })(),
    horario_padrao_inicio: normalizeHorario(form.horario_padrao_inicio) || null,
    horario_padrao_fim: normalizeHorario(form.horario_padrao_fim) || null,
    horario_clinico_inicio: normalizeHorario(form.horario_clinico_inicio) || null,
    horario_clinico_fim: normalizeHorario(form.horario_clinico_fim) || null,
    horario_complementar_inicio:
      normalizeHorario(form.horario_complementar_inicio) || null,
    horario_complementar_fim:
      normalizeHorario(form.horario_complementar_fim) || null,
    janelas_adicionais: janelasAdicionaisToJson(
      form.janela_adicional_inicio,
      form.janela_adicional_fim
    ),
    observacao_operacional: form.observacao_operacional.trim() || null,
  };
}
