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

type FaturaCustosEstado = Pick<
  FaturaRecord,
  "status" | "pago" | "conferido_em"
>;

/**
 * Vencida não é conferida. A data de vencimento, sozinha, não congela
 * uma fatura ainda aberta. O retrato fica preservado depois da conferência
 * ou quando já existe pagamento registrado.
 */
export function faturaCustosCongelada(
  fatura: FaturaCustosEstado | null | undefined
): boolean {
  if (!fatura || fatura.status === "cancelada") return false;
  if (fatura.pago) return true;
  return custosClinicaConferido(fatura);
}

/** Conferência concluída. Status vencida só conta se a conferência já ocorreu. */
export function custosClinicaConferido(
  fatura: FaturaCustosEstado | null | undefined
): boolean {
  if (!fatura || fatura.status === "cancelada" || fatura.status === "rascunho") {
    return false;
  }
  if (fatura.status === "emitida") return true;
  if (fatura.status === "vencida") return Boolean(fatura.conferido_em?.trim());
  return false;
}

/** Aberta para conferência: sem fatura, rascunho ou vencida ainda não conferida nem paga. */
export function custosClinicaEmAberto(
  fatura: FaturaCustosEstado | null | undefined
): boolean {
  if (!fatura) return true;
  if (fatura.pago || custosClinicaConferido(fatura)) return false;
  if (fatura.status === "cancelada") return false;
  return true;
}

export function deriveFaturaMesStatusClinica(
  fatura: FaturaRecord | null
): FaturaMesStatus {
  if (!fatura) return "aberta_emissao";
  if (fatura.status === "cancelada") return "cancelada";
  if (fatura.status === "rascunho") return "rascunho";
  if (fatura.status === "emitida") return "emitida";
  if (fatura.status === "vencida") return "vencida";
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
