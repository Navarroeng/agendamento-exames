import type { ClienteContratoRecord, ClienteContratoStatus } from "@/lib/types";

/** Status visual padronizado do contrato (exibição). */
export type ContratoStatusVisual =
  | "ativo"
  | "proximo_vencimento"
  | "expirado"
  | "encerrado"
  | "pipeline";

export const DIAS_PROXIMO_VENCIMENTO = 30;

function toDateOnly(value: string | null | undefined): string {
  return (value ?? "").slice(0, 10);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve o status visual do contrato.
 * - Encerrado: status encerrado/cancelado ou com encerrado_em
 * - Expirado: vigente prevista já passou e não está ativo operacionalmente
 * - Próximo do vencimento: ativo e faltam <= 30 dias
 * - Ativo: vigente
 * - Pipeline: demais status de onboarding
 */
export function resolveContratoStatusVisual(
  contrato: Pick<
    ClienteContratoRecord,
    "status" | "data_inicio" | "data_fim" | "encerrado_em"
  >,
  hoje = todayIsoDate()
): ContratoStatusVisual {
  if (
    contrato.status === "encerrado" ||
    contrato.status === "cancelado" ||
    Boolean(contrato.encerrado_em)
  ) {
    return "encerrado";
  }

  const fim = toDateOnly(contrato.data_fim);
  const isOperacional =
    contrato.status === "ativo" ||
    contrato.status === "em_renovacao" ||
    contrato.status === "pago";

  if (isOperacional && fim) {
    if (hoje > fim) return "expirado";
    if (hoje >= addDaysIso(fim, -DIAS_PROXIMO_VENCIMENTO)) {
      return "proximo_vencimento";
    }
    return "ativo";
  }

  if (isOperacional) return "ativo";
  return "pipeline";
}

export function labelContratoStatusVisual(
  visual: ContratoStatusVisual,
  statusDb?: ClienteContratoStatus
): string {
  switch (visual) {
    case "ativo":
      return "Ativo";
    case "proximo_vencimento":
      return "Próximo do vencimento";
    case "expirado":
      return "Expirado";
    case "encerrado":
      return "Encerrado";
    case "pipeline":
      return (
        // fallback para rótulos de onboarding
        statusDb === "aguardando_envio"
          ? "Aguardando envio"
          : statusDb === "enviado"
            ? "Enviado"
            : statusDb === "assinado"
              ? "Assinado"
              : statusDb === "aguardando_pagamento"
                ? "Aguardando pagamento"
                : statusDb === "em_renovacao"
                  ? "Em renovação"
                  : "Em andamento"
      );
  }
}

export function contratoStatusVisualBadgeClass(
  visual: ContratoStatusVisual
): string {
  switch (visual) {
    case "ativo":
      return "bg-brand-green-soft text-brand-green";
    case "proximo_vencimento":
      return "bg-[#fef3c7] text-[#b45309]";
    case "expirado":
      return "bg-[#e2e8f0] text-[#334155]";
    case "encerrado":
      return "bg-brand-red-soft text-brand-red";
    default:
      return "bg-[#e0e7ff] text-[#3730a3]";
  }
}
