import { maskEsocialRecibo } from "@/lib/esocial-recibo";
import { emptyToNull, isSim } from "@/lib/money";
import type { AgendamentoFormValues, AgendamentoInsert } from "@/lib/types";

export const AGENDAMENTO_FATURA_SOMENTE_DOCUMENTACAO_MSG =
  "Este agendamento está vinculado a uma fatura já emitida. Campos financeiros e principais estão bloqueados, mas a documentação pode ser atualizada.";

export type AgendamentoDocumentacaoInsert = Pick<
  AgendamentoInsert,
  | "aso_enviado_clinica"
  | "data_aso_enviado_clinica"
  | "aso_assinado"
  | "data_aso_assinado"
  | "aso_enviado_cliente"
  | "data_aso_enviado_cliente"
  | "numero_matricula"
  | "envio_esocial"
  | "data_envio_esocial"
  | "esocial_recibo"
  | "observacoes"
>;

export function buildDocumentacaoPayloadFromForm(
  form: AgendamentoFormValues
): AgendamentoDocumentacaoInsert {
  return {
    aso_enviado_clinica: isSim(form.aso_enviado_clinica),
    data_aso_enviado_clinica: isSim(form.aso_enviado_clinica)
      ? emptyToNull(form.data_aso_enviado_clinica)
      : null,
    aso_assinado: isSim(form.aso_assinado),
    data_aso_assinado: isSim(form.aso_assinado)
      ? emptyToNull(form.data_aso_assinado)
      : null,
    aso_enviado_cliente: isSim(form.aso_enviado_cliente),
    data_aso_enviado_cliente: isSim(form.aso_enviado_cliente)
      ? emptyToNull(form.data_aso_enviado_cliente)
      : null,
    numero_matricula: emptyToNull(form.numero_matricula),
    envio_esocial: isSim(form.envio_esocial),
    data_envio_esocial: isSim(form.envio_esocial)
      ? emptyToNull(form.data_envio_esocial)
      : null,
    esocial_recibo: isSim(form.envio_esocial)
      ? emptyToNull(maskEsocialRecibo(form.esocial_recibo))
      : null,
    observacoes: emptyToNull(form.observacoes),
  };
}
