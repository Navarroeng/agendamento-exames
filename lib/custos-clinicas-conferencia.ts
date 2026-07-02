import type { FaturaMesStatus } from "@/lib/fatura-mes-resumo";

export const CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO = "Marcar como conferido";
export const CUSTOS_CLINICA_ACAO_REABRIR = "Reabrir conferência";
export const CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO = "Registrar pagamento";

export const FATURA_MES_STATUS_LABELS_CLINICA: Record<FaturaMesStatus, string> =
  {
    aberta_emissao: "Aberta para conferência",
    rascunho: "Aberta para conferência",
    emitida: "Conferido",
    paga: "Pago",
    cancelada: "Cancelada",
    necessita_reemissao: "Necessita reemissão",
    substituida: "Substituída",
    reemitida: "Reemitida",
  };

export function historicoStatusLabelClinica(
  status: "rascunho" | "emitida" | "cancelada",
  pago: boolean
): string {
  if (status === "cancelada") return "Cancelada";
  if (status === "rascunho") return "Aberta para conferência";
  if (status === "emitida") return pago ? "Pago" : "Conferido";
  return status;
}

export const HISTORICO_STATUS_FILTER_LABELS_CLINICA: Record<
  string,
  string
> = {
  rascunho: "Aberta para conferência",
  emitida: "Conferido",
  cancelada: "Cancelada",
  paga: "Pago",
  pendente: "Conferido (aguardando pagamento)",
};

export function formatAuditoriaMarcarConferido(
  usuario: string,
  clinicaNome: string
): string {
  return `${usuario} marcou os custos da clínica ${clinicaNome} como conferidos.`;
}

export function formatAuditoriaReabrirConferencia(
  usuario: string,
  clinicaNome: string
): string {
  return `${usuario} reabriu a conferência dos custos da clínica ${clinicaNome}.`;
}
