/**
 * Portal do Cliente — módulo Faturas.
 * DTOs, regras de apresentação e helpers de isolamento.
 * Sem PII. Sem lógica financeira nova — reutiliza regras de fatura-*.ts.
 */

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { faturaDeveMarcarComoVencida } from "@/lib/fatura-inadimplencia";
import { mesReferenciaBRFromFatura } from "@/lib/fatura-reemissao";
import { formatCurrency } from "@/lib/money";
import type { FaturaComItens, FaturaItemRecord, FaturaRecord, FaturaStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Status visível ao cliente — subconjunto do FaturaStatus interno
// ---------------------------------------------------------------------------

export type PortalFaturaStatus =
  | "emitida"
  | "vencida"
  | "paga"
  | "cancelada"
  | "outros";

export const PORTAL_FATURA_STATUS_LABELS: Record<PortalFaturaStatus, string> = {
  emitida: "Em aberto",
  vencida: "Vencida",
  paga: "Paga",
  cancelada: "Cancelada",
  outros: "—",
};

/** Converte o status interno da fatura para o status visível no portal. */
export function resolverStatusPortalFatura(
  fatura: Pick<FaturaRecord, "status" | "pago" | "data_vencimento" | "tipo">,
  dataReferencia: Date = new Date()
): PortalFaturaStatus {
  if (fatura.pago) return "paga";

  // Checar se ficou vencida em runtime (mesmo que DB ainda mostre 'emitida')
  if (
    fatura.status === "emitida" &&
    faturaDeveMarcarComoVencida(fatura, dataReferencia)
  ) {
    return "vencida";
  }

  switch (fatura.status) {
    case "emitida":
      return "emitida";
    case "vencida":
      return "vencida";
    case "cancelada":
    case "substituida":
    case "reemitida":
      return "cancelada";
    case "necessita_reemissao":
      // Ao cliente parece "em aberto" — está sendo reemitida
      return "emitida";
    default:
      return "outros";
  }
}

/** Status que devem aparecer por padrão (excluindo canceladas e rascunhos). */
export function portaFaturaStatusEhVisivel(
  status: PortalFaturaStatus
): boolean {
  return status !== "cancelada" && status !== "outros";
}

// ---------------------------------------------------------------------------
// DTO: linha na listagem
// ---------------------------------------------------------------------------

export type PortalFaturaLinha = {
  id: string;
  numero: string;
  competencia: string | null;
  dataEmissao: string | null;
  dataVencimento: string;
  valorTotal: number;
  valorFormatado: string;
  status: PortalFaturaStatus;
  pago: boolean;
  dataPagamento: string | null;
};

export function faturaToPortalLinha(
  fatura: FaturaRecord,
  dataReferencia: Date = new Date()
): PortalFaturaLinha {
  return {
    id: fatura.id,
    numero: fatura.numero,
    competencia: mesReferenciaBRFromFatura(fatura),
    dataEmissao: fatura.data_emissao
      ? formatDateIsoToBR(fatura.data_emissao)
      : null,
    dataVencimento: formatDateIsoToBR(fatura.data_vencimento),
    valorTotal: Number(fatura.valor_total),
    valorFormatado: formatCurrency(Number(fatura.valor_total)),
    status: resolverStatusPortalFatura(fatura, dataReferencia),
    pago: fatura.pago,
    dataPagamento: fatura.data_pagamento
      ? formatDateIsoToBR(fatura.data_pagamento)
      : null,
  };
}

// ---------------------------------------------------------------------------
// DTO: detalhe de uma fatura
// ---------------------------------------------------------------------------

export type PortalFaturaItemLinha = {
  id: string;
  colaborador: string;
  dataAgendamento: string;
  tipoAso: string;
  exameNome: string;
  clinicaNome: string;
  quantidade: number;
  valorUnitario: number;
  valorUnitarioFormatado: string;
  valorTotal: number;
  valorTotalFormatado: string;
};

export type PortalFaturaDetalhe = PortalFaturaLinha & {
  itens: PortalFaturaItemLinha[];
  totalItens: number;
  dadosBancarios: typeof PORTAL_DADOS_BANCARIOS_PAGAMENTO;
};

// Dados de pagamento reutilizados do navarro-pagamento
export const PORTAL_DADOS_BANCARIOS_PAGAMENTO = {
  banco: "Itaú (341)",
  agencia: "0760",
  conta: "99729-6",
  pixCnpj: "45.206.250/0001-10",
  favorecido:
    "NAVARRO ENGENHARIA DE SEGURANÇA DO TRABALHO E MEDICINA OCUPACIONAL LTDA",
} as const;

function faturaItemToPortalLinha(item: FaturaItemRecord): PortalFaturaItemLinha {
  return {
    id: item.id,
    colaborador: item.colaborador,
    dataAgendamento: formatDateIsoToBR(item.data_agendamento),
    tipoAso: item.tipo_aso,
    exameNome: item.exame_nome,
    clinicaNome: item.clinica_nome,
    quantidade: item.quantidade,
    valorUnitario: Number(item.valor_unitario),
    valorUnitarioFormatado: formatCurrency(Number(item.valor_unitario)),
    valorTotal: Number(item.valor_total),
    valorTotalFormatado: formatCurrency(Number(item.valor_total)),
  };
}

export function faturaComItensToPortalDetalhe(
  fatura: FaturaComItens,
  dataReferencia: Date = new Date()
): PortalFaturaDetalhe {
  const linha = faturaToPortalLinha(fatura, dataReferencia);
  const itens = (fatura.fatura_itens ?? []).map(faturaItemToPortalLinha);
  return {
    ...linha,
    itens,
    totalItens: itens.length,
    dadosBancarios: PORTAL_DADOS_BANCARIOS_PAGAMENTO,
  };
}

// ---------------------------------------------------------------------------
// DTO: resumo para o card da Home
// ---------------------------------------------------------------------------

export type PortalFaturasResumo = {
  totalEmAberto: number;
  totalVencidas: number;
  totalPagas: number;
  valorEmAberto: number;
  valorEmAbertoFormatado: string;
  temFaturas: boolean;
};

export function calcPortalFaturasResumo(
  faturas: FaturaRecord[],
  dataReferencia: Date = new Date()
): PortalFaturasResumo {
  let totalEmAberto = 0;
  let totalVencidas = 0;
  let totalPagas = 0;
  let valorEmAberto = 0;

  for (const f of faturas) {
    const status = resolverStatusPortalFatura(f, dataReferencia);
    if (status === "emitida") {
      totalEmAberto += 1;
      valorEmAberto += Number(f.valor_total);
    } else if (status === "vencida") {
      totalVencidas += 1;
      valorEmAberto += Number(f.valor_total);
    } else if (status === "paga") {
      totalPagas += 1;
    }
  }

  return {
    totalEmAberto,
    totalVencidas,
    totalPagas,
    valorEmAberto,
    valorEmAbertoFormatado: formatCurrency(valorEmAberto),
    temFaturas: faturas.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Filtros do portal
// ---------------------------------------------------------------------------

export type PortalFaturaStatusFiltro =
  | "todas"
  | "emitida"
  | "vencida"
  | "paga"
  | "cancelada";

export interface PortalFaturaFiltros {
  status: PortalFaturaStatusFiltro;
  competencia: string; // MM/AAAA ou ""
  mostrarCanceladas: boolean;
}

export const PORTAL_FATURA_FILTROS_DEFAULT: PortalFaturaFiltros = {
  status: "todas",
  competencia: "",
  mostrarCanceladas: false,
};

export function filtrarPortalFaturas(
  faturas: PortalFaturaLinha[],
  filtros: PortalFaturaFiltros
): PortalFaturaLinha[] {
  return faturas.filter((f) => {
    // Status "outros" (rascunhos etc.) nunca visíveis no portal
    if (f.status === "outros") return false;

    // Canceladas: ocultas por padrão, a menos que explicitamente selecionadas
    // (pelo checkbox "Mostrar canceladas" OU pelo filtro de status === "cancelada")
    if (
      f.status === "cancelada" &&
      !filtros.mostrarCanceladas &&
      filtros.status !== "cancelada"
    ) {
      return false;
    }

    if (filtros.status !== "todas" && f.status !== filtros.status) return false;

    if (filtros.competencia.trim()) {
      if (!f.competencia?.startsWith(filtros.competencia.trim())) return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Validação de pertencimento (isolamento por cliente)
// ---------------------------------------------------------------------------

/**
 * Verifica se a fatura pertence ao cliente esperado.
 * Usa referencia_id (UUID) como fonte primária; fallback em referencia_nome.
 */
export function faturaPertencesseAoCliente(
  fatura: Pick<FaturaRecord, "tipo" | "referencia_id" | "referencia_nome">,
  clienteId: string,
  clienteNome: string
): boolean {
  if (fatura.tipo !== "cliente") return false;

  if (fatura.referencia_id) {
    return fatura.referencia_id === clienteId;
  }

  // Fallback por nome (normalizado)
  return (
    fatura.referencia_nome.trim().toLowerCase() ===
    clienteNome.trim().toLowerCase()
  );
}

// ---------------------------------------------------------------------------
// Status internos que devem ser carregados para o portal
// (exclui rascunho — nunca visível ao cliente)
// ---------------------------------------------------------------------------

export const PORTAL_FATURA_STATUS_INCLUIDOS: FaturaStatus[] = [
  "emitida",
  "vencida",
  "necessita_reemissao",
  "cancelada",
  "substituida",
  "reemitida",
];
