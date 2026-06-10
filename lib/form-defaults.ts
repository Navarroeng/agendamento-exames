import { SIM_NAO } from "@/lib/constants";
import type { AgendamentoFormValues, ExameFormItem } from "@/lib/types";

export function getEmptyForm(): AgendamentoFormValues {
  return {
    data_agendamento: "",
    horario: "",
    cliente_nome: "",
    colaborador: "",
    aso: "",
    clinica_nome: "",
    responsavel: "",
    observacoes: "",
    aso_enviado_clinica: SIM_NAO[0],
    data_aso_enviado_clinica: "",
    aso_assinado: SIM_NAO[0],
    data_aso_assinado: "",
    aso_enviado_cliente: SIM_NAO[0],
    data_aso_enviado_cliente: "",
    numero_matricula: "",
    envio_esocial: SIM_NAO[0],
    data_envio_esocial: "",
    esocial_recibo: "",
  };
}

export function createEmptyExam(): ExameFormItem {
  return {
    id: crypto.randomUUID(),
    exame_id: "",
    tipo_exame: "",
    valor_cliente: "",
    custo_clinica: "",
    lucro: "",
    aviso: "",
    precoAutomatico: false,
    clinicoValorManual: false,
  };
}
