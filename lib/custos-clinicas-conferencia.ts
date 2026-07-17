import { formatDateBR } from "@/lib/format";
import type { FaturaMesStatus } from "@/lib/fatura-mes-resumo";
import type { FaturaRecord } from "@/lib/types";

export const CUSTOS_CLINICA_ACAO_MARCAR_CONFERIDO = "Marcar como conferido";
export const CUSTOS_CLINICA_ACAO_REABRIR = "Reabrir conferência";
export const CUSTOS_CLINICA_ACAO_REGISTRAR_PAGAMENTO = "Registrar pagamento";
export const CUSTOS_CLINICA_ACAO_VER_FATURA = "Ver fatura da clínica";

export const FATURA_MES_STATUS_LABELS_CLINICA: Record<FaturaMesStatus, string> =
  {
    aberta_emissao: "Aberta para conferência",
    rascunho: "Aberta para conferência",
    emitida: "Conferido",
    vencida: "Vencida",
    paga: "Pago",
    cancelada: "Cancelada",
    necessita_reemissao: "Necessita reemissão",
    substituida: "Substituída",
    reemitida: "Reemitida",
  };

export function historicoStatusLabelClinica(
  status: "rascunho" | "emitida" | "cancelada",
  _pago = false
): string {
  if (status === "cancelada") return "Cancelada";
  if (status === "rascunho") return "Aberta para conferência";
  if (status === "emitida") return "Conferido";
  return status;
}

export const HISTORICO_STATUS_FILTER_LABELS_CLINICA: Record<
  string,
  string
> = {
  rascunho: "Aberta para conferência",
  emitida: "Conferido",
  cancelada: "Cancelada",
  paga: "Conferido",
};

/** Custos conferidos (status emitida) contam como pagos no resumo. */
export function custosClinicaConferido(
  fatura: Pick<FaturaRecord, "status"> | null | undefined
): boolean {
  return fatura?.status === "emitida";
}

/** Aberta para conferência: sem fatura ou rascunho. */
export function custosClinicaEmAberto(
  fatura: Pick<FaturaRecord, "status"> | null | undefined
): boolean {
  if (!fatura) return true;
  return fatura.status === "rascunho";
}

export function deriveFaturaMesStatusClinica(
  fatura: FaturaRecord | null
): FaturaMesStatus {
  if (!fatura) return "aberta_emissao";
  if (fatura.status === "cancelada") return "cancelada";
  if (fatura.status === "rascunho") return "rascunho";
  if (fatura.status === "emitida") return "emitida";
  return "aberta_emissao";
}

export function formatAuditoriaMarcarConferido(
  usuario: string,
  clinicaNome: string
): string {
  return `${usuario} conferiu os custos da clínica ${clinicaNome}. O valor foi considerado pago.`;
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
  return `${usuario} reabriu a conferência dos custos da clínica ${clinicaNome}. O valor voltou para em aberto.`;
}
