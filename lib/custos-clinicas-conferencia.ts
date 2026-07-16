import { formatCurrency } from "@/lib/money";
import { formatDateBR } from "@/lib/format";
import type { FaturaMesStatus } from "@/lib/fatura-mes-resumo";

export const CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO = "Marcar como conferido";
export const CUSTOS_CLINICA_ACAO_REABRIR = "Reabrir conferência";
export const CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO = "Registrar pagamento";
export const CUSTOS_CLINICA_ACAO_VER_FATURA = "Ver fatura da clínica";

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
  clinicaNome: string,
  periodoLabel: string,
  dataConferenciaIso: string,
  valorTotal: number,
  faturaNome: string,
  observacao?: string | null
): string {
  const dataLabel = formatDateBR(dataConferenciaIso);
  const valorLabel = formatCurrency(valorTotal);
  const obs = observacao?.trim();
  let message =
    `${usuario} conferiu os custos da clínica ${clinicaNome} referentes ao período ${periodoLabel}. ` +
    `Data da conferência: ${dataLabel}. Valor total: ${valorLabel}. ` +
    `Fatura anexada: ${faturaNome}.`;
  if (obs) {
    message += ` Observação: ${obs}.`;
  }
  return message;
}

export function periodoLabelCustosClinica(
  fatura: Pick<
    import("@/lib/types").FaturaRecord,
    "periodo_inicio" | "periodo_fim" | "mes_referencia"
  >
): string {
  if (fatura.periodo_inicio && fatura.periodo_fim) {
    return `${formatDateBR(fatura.periodo_inicio)} a ${formatDateBR(fatura.periodo_fim)}`;
  }
  const mes = fatura.mes_referencia?.trim();
  if (mes) {
    const [y, m] = mes.split("-");
    if (y && m) return `${m}/${y}`;
  }
  return "—";
}

export function formatAuditoriaReabrirConferencia(
  usuario: string,
  clinicaNome: string
): string {
  return `${usuario} reabriu a conferência dos custos da clínica ${clinicaNome}.`;
}
