import { maskCPFInput } from "@/lib/cpf";
import {
  formatDateIsoToBR,
  formatHorarioForForm,
} from "@/lib/agendamento-datetime";
import { isExameClinicoManual } from "@/lib/exame-pricing";
import { formatEsocialReciboForDisplay } from "@/lib/esocial-recibo";
import { formatMoney } from "@/lib/money";
import type {
  AgendamentoFormValues,
  AgendamentoWithExames,
  ExameFormItem,
} from "@/lib/types";

function boolToSimNao(value: boolean): string {
  return value ? "Sim" : "Não";
}

export function agendamentoToFormValues(
  agendamento: AgendamentoWithExames
): AgendamentoFormValues {
  return {
    data_agendamento: formatDateIsoToBR(agendamento.data_agendamento),
    horario: formatHorarioForForm(agendamento.horario),
    cliente_nome: agendamento.cliente_nome ?? "",
    colaborador: agendamento.colaborador ?? "",
    colaborador_cpf: maskCPFInput(agendamento.colaborador_cpf ?? ""),
    aso: agendamento.aso ?? "",
    clinica_nome: agendamento.clinica_nome ?? "",
    responsavel: agendamento.responsavel ?? "",
    observacoes: agendamento.observacoes ?? "",
    aso_enviado_clinica: boolToSimNao(agendamento.aso_enviado_clinica),
    data_aso_enviado_clinica: agendamento.data_aso_enviado_clinica ?? "",
    aso_assinado: boolToSimNao(agendamento.aso_assinado),
    data_aso_assinado: agendamento.data_aso_assinado ?? "",
    aso_enviado_cliente: boolToSimNao(agendamento.aso_enviado_cliente),
    data_aso_enviado_cliente: agendamento.data_aso_enviado_cliente ?? "",
    numero_matricula: agendamento.numero_matricula ?? "",
    envio_esocial: boolToSimNao(agendamento.envio_esocial),
    data_envio_esocial: agendamento.data_envio_esocial ?? "",
    esocial_recibo: formatEsocialReciboForDisplay(agendamento.esocial_recibo),
  };
}

export function agendamentoToExams(
  agendamento: AgendamentoWithExames
): ExameFormItem[] {
  const exames = agendamento.agendamento_exames ?? [];

  if (exames.length === 0) {
    return [];
  }

  return exames.map((exam) => {
    const valor = formatMoney(Number(exam.valor_cliente));
    const custo = formatMoney(Number(exam.custo_clinica));
    const clinico = isExameClinicoManual(exam.tipo_exame);
    return {
      id: exam.id,
      exame_id: "",
      tipo_exame: exam.tipo_exame,
      valor_cliente: valor,
      custo_clinica: custo,
      lucro: formatMoney(Number(exam.valor_cliente) - Number(exam.custo_clinica)),
      aviso: "",
      precoAutomatico: !clinico,
      clinicoValorManual: clinico,
      motivo_valor_zero: exam.motivo_valor_zero ?? "",
    };
  });
}
