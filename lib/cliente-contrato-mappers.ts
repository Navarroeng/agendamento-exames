import {
  CLIENTE_CONTRATO_STATUS_OPTIONS,
  CLIENTE_CONTRATO_TIPO_OPTIONS,
} from "@/lib/cliente-contrato-constants";
import { formatDateBR } from "@/lib/format";
import { formatCurrency, formatCurrencyBRL } from "@/lib/money";
import type {
  ClienteContratoFormValues,
  ClienteContratoRecord,
  ClienteContratoStatus,
  ClienteContratoTipo,
} from "@/lib/types";

export function labelClienteContratoStatus(status: ClienteContratoStatus): string {
  return (
    CLIENTE_CONTRATO_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
    status
  );
}

export function labelClienteContratoTipo(
  tipo: ClienteContratoTipo | null | undefined
): string {
  if (!tipo) return "—";
  return (
    CLIENTE_CONTRATO_TIPO_OPTIONS.find((item) => item.value === tipo)?.label ??
    tipo
  );
}

export function clienteContratoStatusBadgeClass(
  status: ClienteContratoStatus
): string {
  switch (status) {
    case "ativo":
      return "bg-brand-green-soft text-brand-green";
    case "em_renovacao":
      return "bg-[#fef3c7] text-[#b45309]";
    case "encerrado":
      return "bg-[#f4f6fb] text-[#52617a]";
    case "cancelado":
      return "bg-brand-red-soft text-brand-red";
    default:
      return "bg-[#f4f6fb] text-[#52617a]";
  }
}

export function formatVigenciaContrato(
  inicio: string,
  fim: string | null | undefined
): string {
  const start = formatDateBR(inicio);
  const end = fim ? formatDateBR(fim) : "Indeterminado";
  return `${start} → ${end}`;
}

export function formatValorContrato(valor: number | null | undefined): string {
  if (valor == null || Number.isNaN(Number(valor))) return "—";
  return formatCurrencyBRL(Number(valor));
}

export function formatReajusteContrato(
  reajuste: number | null | undefined
): string {
  if (reajuste == null || Number.isNaN(Number(reajuste))) return "—";
  return `${Number(reajuste).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

export function contratoToFormValues(
  contrato: ClienteContratoRecord
): ClienteContratoFormValues {
  return {
    data_inicio: contrato.data_inicio,
    data_fim: contrato.data_fim ?? "",
    quantidade_colaboradores:
      contrato.quantidade_colaboradores != null
        ? String(contrato.quantidade_colaboradores)
        : "",
    valor_contrato:
      contrato.valor_contrato != null
        ? formatCurrency(Number(contrato.valor_contrato))
        : "",
    condicao_pagamento: contrato.condicao_pagamento ?? "",
    tipo_contrato: contrato.tipo_contrato ?? "anual",
    reajuste_percentual:
      contrato.reajuste_percentual != null
        ? String(contrato.reajuste_percentual)
        : "",
    observacoes: contrato.observacoes ?? "",
    status: contrato.status,
  };
}

export function getContratoAtual(
  contratos: ClienteContratoRecord[]
): ClienteContratoRecord | null {
  return (
    contratos.find((item) => item.status === "ativo") ??
    contratos.find((item) => item.status === "em_renovacao") ??
    null
  );
}

export function getHistoricoContratos(
  contratos: ClienteContratoRecord[],
  contratoAtualId?: string | null
): ClienteContratoRecord[] {
  return contratos.filter((item) => item.id !== contratoAtualId);
}
