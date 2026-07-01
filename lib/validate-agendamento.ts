import {
  CARGO_OBRIGATORIO_TOAST,
  CARGO_SEM_EXAMES_TOAST,
  getExamesValidosAgendamento,
  hasCargoSelecionado,
  hasExamesObrigatoriosCarregados,
} from "@/lib/agendamento-exames-cargo";
import {
  EXAME_CLINICO_NAO_ENCONTRADO_RETORNO_MSG,
  isAsoRetornoAoTrabalho,
} from "@/lib/agendamento-aso-retorno-trabalho";
import { isValidCPF } from "@/lib/cpf";
import { SIM_NAO } from "@/lib/constants";
import {
  isValidDateBR,
  isValidHorario24,
} from "@/lib/agendamento-datetime";
import {
  exigeMotivoClinicoZeroDemissional,
  MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST,
} from "@/lib/agendamento-clinico-zero-demissional";
import {
  isExameClinicoManual,
  permiteClinicoValorZero,
} from "@/lib/exame-pricing";
import { isValidEsocialRecibo } from "@/lib/esocial-recibo";
import { parseMoney } from "@/lib/money";
import type { AgendamentoFormValues, ExameFormItem } from "@/lib/types";

export const VALIDATION_TOAST_MESSAGE =
  "Preencha todos os campos obrigatórios antes de salvar.";

export const CPF_COLABORADOR_TOAST =
  "Informe um CPF válido do colaborador.";

export const ESOCIAL_RECIBO_TOAST =
  "Informe o Nº Recibo completo do e-Social.";

export {
  CARGO_OBRIGATORIO_TOAST,
  CARGO_SEM_EXAMES_TOAST,
} from "@/lib/agendamento-exames-cargo";

function isFilled(value: string): boolean {
  return value.trim() !== "";
}

function isSimOuNao(value: string): boolean {
  return SIM_NAO.includes(value as (typeof SIM_NAO)[number]);
}

function requireDateWhenSim(simValue: string, dateValue: string): boolean {
  if (simValue !== "Sim") return true;
  return isFilled(dateValue);
}

function requireReciboWhenSim(simValue: string, recibo: string): boolean {
  if (simValue !== "Sim") return true;
  return isFilled(recibo) && isValidEsocialRecibo(recibo);
}

function hasValidValorCliente(exam: ExameFormItem, aso: string): boolean {
  if (!isFilled(exam.valor_cliente)) return false;

  const valor = parseMoney(exam.valor_cliente);
  if (
    isExameClinicoManual(exam.tipo_exame) &&
    permiteClinicoValorZero(aso)
  ) {
    return valor >= 0;
  }

  if (exigeMotivoClinicoZeroDemissional(aso, exam)) {
    return valor === 0 && isFilled(exam.motivo_valor_zero ?? "");
  }

  return valor > 0;
}

function isExamComplete(exam: ExameFormItem, aso: string): boolean {
  return (
    isFilled(exam.tipo_exame) &&
    hasValidValorCliente(exam, aso) &&
    isFilled(exam.custo_clinica) &&
    !exam.aviso
  );
}

export { MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST };

export function getAgendamentoValidationMessage(
  form: AgendamentoFormValues,
  exams: ExameFormItem[],
  cargoId: string
): string | null {
  if (isAgendamentoCompleto(form, exams, cargoId)) return null;

  if (!hasCargoSelecionado(cargoId)) {
    return CARGO_OBRIGATORIO_TOAST;
  }

  if (!hasExamesObrigatoriosCarregados(exams)) {
    return CARGO_SEM_EXAMES_TOAST;
  }

  if (isAsoRetornoAoTrabalho(form.aso)) {
    if (
      exams.some((exam) => exam.aviso === EXAME_CLINICO_NAO_ENCONTRADO_RETORNO_MSG)
    ) {
      return EXAME_CLINICO_NAO_ENCONTRADO_RETORNO_MSG;
    }
  }

  if (
    form.envio_esocial === "Sim" &&
    !requireReciboWhenSim(form.envio_esocial, form.esocial_recibo)
  ) {
    return ESOCIAL_RECIBO_TOAST;
  }

  if (!isFilled(form.colaborador_cpf) || !isValidCPF(form.colaborador_cpf)) {
    return CPF_COLABORADOR_TOAST;
  }

  const examesValidos = getExamesValidosAgendamento(exams);
  for (const exam of examesValidos) {
    if (
      exigeMotivoClinicoZeroDemissional(form.aso, exam) &&
      !isFilled(exam.motivo_valor_zero ?? "")
    ) {
      return MOTIVO_CLINICO_ZERO_DEMISSIONAL_TOAST;
    }
  }

  return VALIDATION_TOAST_MESSAGE;
}

export function isAgendamentoCompleto(
  form: AgendamentoFormValues,
  exams: ExameFormItem[],
  cargoId: string
): boolean {
  if (!hasCargoSelecionado(cargoId)) return false;

  const examesValidos = getExamesValidosAgendamento(exams);
  if (examesValidos.length === 0) return false;

  const formOk =
    isFilled(form.data_agendamento) &&
    isValidDateBR(form.data_agendamento) &&
    isFilled(form.horario) &&
    isValidHorario24(form.horario) &&
    isFilled(form.cliente_nome) &&
    isFilled(form.colaborador) &&
    isFilled(form.colaborador_cpf) &&
    isValidCPF(form.colaborador_cpf) &&
    isFilled(form.aso) &&
    isFilled(form.clinica_nome) &&
    isFilled(form.responsavel) &&
    isSimOuNao(form.aso_enviado_clinica) &&
    isSimOuNao(form.aso_assinado) &&
    isSimOuNao(form.aso_enviado_cliente) &&
    isSimOuNao(form.envio_esocial) &&
    requireDateWhenSim(
      form.aso_enviado_clinica,
      form.data_aso_enviado_clinica
    ) &&
    requireDateWhenSim(form.aso_assinado, form.data_aso_assinado) &&
    requireDateWhenSim(
      form.aso_enviado_cliente,
      form.data_aso_enviado_cliente
    ) &&
    requireDateWhenSim(form.envio_esocial, form.data_envio_esocial) &&
    requireReciboWhenSim(form.envio_esocial, form.esocial_recibo);

  const examsOk = examesValidos.every((exam) => isExamComplete(exam, form.aso));

  return formOk && examsOk;
}
