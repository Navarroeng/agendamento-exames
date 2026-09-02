import type { FaturaRecord, FaturaStatus } from "@/lib/types";

/** Status históricos — sem fluxo financeiro ativo. */
export const FATURA_STATUS_INATIVOS: FaturaStatus[] = [
  "cancelada",
  "substituida",
  "reemitida",
];

export function faturaStatusEmissaoAtiva(status: FaturaStatus): boolean {
  return status === "emitida" || status === "vencida";
}

export function faturaStatusPermitePagamento(status: FaturaStatus): boolean {
  return status === "emitida" || status === "vencida";
}

export function faturaStatusContaNoResumoEmitido(status: FaturaStatus): boolean {
  return status === "emitida" || status === "vencida";
}

export function faturaStatusHistoricoInativo(status: FaturaStatus): boolean {
  return (
    status === "substituida" ||
    status === "reemitida" ||
    status === "cancelada"
  );
}

export function faturaStatusHistoricoReemissao(status: FaturaStatus): boolean {
  return status === "substituida" || status === "reemitida";
}

/** Converte mes_referencia (YYYY-MM) ou periodo_inicio em MM/AAAA. */
export function mesReferenciaBRFromFatura(
  fatura: Pick<FaturaRecord, "mes_referencia" | "periodo_inicio">
): string | null {
  const iso = fatura.mes_referencia?.trim() || fatura.periodo_inicio?.trim();
  if (!iso) return null;

  const base = iso.split("T")[0];
  const match = base.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;

  return `${match[2]}/${match[1]}`;
}

const MESES_COMPETENCIA_UPPER = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

/** Competência em MÊS/ANO maiúsculo (ex.: AGOSTO/2026) para e-mail e assunto. */
export function competenciaLabelBRUpperFromFatura(
  fatura: Pick<FaturaRecord, "mes_referencia" | "periodo_inicio">
): string | null {
  const br = mesReferenciaBRFromFatura(fatura);
  if (!br) return null;
  const [mm, yyyy] = br.split("/");
  const monthIndex = parseInt(mm ?? "", 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${MESES_COMPETENCIA_UPPER[monthIndex]}/${yyyy}`;
}

export function canReemitirFaturaCliente(fatura: FaturaRecord): boolean {
  if (fatura.tipo !== "cliente") return false;
  return (
    fatura.status === "necessita_reemissao" || fatura.status === "cancelada"
  );
}

export function faturaClienteBloqueiaFaturamento(
  fatura: Pick<FaturaRecord, "status" | "tipo">
): boolean {
  return (
    fatura.tipo === "cliente" &&
    (fatura.status === "emitida" ||
      fatura.status === "vencida" ||
      fatura.status === "necessita_reemissao")
  );
}
