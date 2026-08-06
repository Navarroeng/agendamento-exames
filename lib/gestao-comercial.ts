/**
 * Gestão Comercial — camada única de cálculo (cards = gráfico = tabela).
 * Valores = contratados/fechados (aprovação), não recebimento/faturamento.
 */
import { formatCurrency } from "@/lib/money";
import {
  formatOrcamentoOrigemCliente,
  type OrcamentoOrigemCliente,
} from "@/lib/orcamento-origem";
import type { ClienteContratoStatus } from "@/lib/types";

export const GESTAO_COMERCIAL_DISCLAIMER =
  "Valores comerciais fechados de contratos ativos (contabilizáveis), independentemente do recebimento. Encerrados e cancelados ficam fora dos totais principais.";

export type GestaoComercialFormaPagamento = "avista" | "parcelado";

export type GestaoComercialTipoContratoFiltro = "novo" | "renovacao" | "";

/** Filtro de status comercial (padrão: ativos/contabilizáveis). */
export type GestaoComercialStatusFiltro = "ativos" | "encerrados" | "todos";

export interface GestaoComercialFilters {
  ano: number;
  mes: number | null; // 1-12
  periodoInicio: string; // YYYY-MM-DD personalizado (opcional)
  periodoFim: string;
  responsavel: string;
  origem: "" | OrcamentoOrigemCliente;
  tipo: GestaoComercialTipoContratoFiltro;
  statusContrato: GestaoComercialStatusFiltro;
  usarPeriodoPersonalizado: boolean;
}

export interface GestaoComercialFechamentoRow {
  aprovacaoId: string;
  orcamentoId: string;
  contratoId: string | null;
  aprovadoEm: string;
  numeroOrcamento: string;
  numeroContrato: string | null;
  clienteNome: string;
  clienteCnpj: string;
  origem: OrcamentoOrigemCliente | null;
  responsavelNoFechamento: string;
  responsavelAproximado: boolean;
  quantidadeColaboradores: number;
  valorOriginalOrcamento: number;
  valorFinalAprovado: number | null;
  /** Valor usado nos totais (final ou fallback). */
  valorFechado: number;
  usouValorOriginalFallback: boolean;
  formaPagamento: GestaoComercialFormaPagamento;
  condicaoPagamento: string | null;
  statusContrato: ClienteContratoStatus | null;
  orcamentoStatus: string | null;
}

export interface GestaoComercialComparacao {
  valorAtual: number;
  valorAnterior: number;
  diferenca: number;
  percentual: number | null;
  tendencia: "alta" | "baixa" | "igual" | "sem_base";
  label: string;
}

export interface GestaoComercialSerieMes {
  mes: number; // 1-12
  label: string;
  valorFechado: number;
  quantidade: number;
  ticketMedio: number;
}

export interface GestaoComercialGrupoResumo {
  chave: string;
  label: string;
  quantidade: number;
  valorFechado: number;
  ticketMedio: number;
  percentualValor: number;
}

export interface GestaoComercialPagamentoResumo {
  avistaQtd: number;
  parceladoQtd: number;
  avistaValor: number;
  parceladoValor: number;
}

export interface GestaoComercialDashboard {
  filtrosEfetivos: { inicio: string; fim: string; mesRef: number; anoRef: number };
  rows: GestaoComercialFechamentoRow[];
  valorFechado: number;
  contratosFechados: number;
  ticketMedio: number;
  novosClientes: number;
  renovacoes: number;
  contratosEncerrados: number;
  contratosAtivos: number;
  comparacao: GestaoComercialComparacao;
  serieMensalAno: GestaoComercialSerieMes[];
  porOrigem: GestaoComercialGrupoResumo[];
  porResponsavel: GestaoComercialGrupoResumo[];
  novosVsRenovacao: {
    novos: GestaoComercialGrupoResumo;
    renovacoes: GestaoComercialGrupoResumo;
  };
  pagamento: GestaoComercialPagamentoResumo;
}

export const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

export function defaultGestaoComercialFilters(
  now = new Date()
): GestaoComercialFilters {
  return {
    ano: now.getFullYear(),
    mes: now.getMonth() + 1,
    periodoInicio: "",
    periodoFim: "",
    responsavel: "",
    origem: "",
    tipo: "",
    statusContrato: "ativos",
    usarPeriodoPersonalizado: false,
  };
}

export function resolveFormaPagamentoFechamento(params: {
  quantidade_parcelas?: number | null;
  valor_parcela?: number | null;
  condicao_pagamento?: string | null;
}): GestaoComercialFormaPagamento {
  if (
    params.quantidade_parcelas != null &&
    Number(params.quantidade_parcelas) > 1
  ) {
    return "parcelado";
  }
  if (params.valor_parcela != null && Number(params.valor_parcela) > 0) {
    return "parcelado";
  }
  const condicao = (params.condicao_pagamento ?? "").toLowerCase();
  if (condicao.includes("x de") || /^\d+x\b/.test(condicao)) {
    return "parcelado";
  }
  return "avista";
}

/** valor_final válido; senão fallback no valor original do orçamento. */
export function resolveValorFechado(
  valorFinal: number | null | undefined,
  valorOriginal: number | null | undefined
): { valor: number; usouFallback: boolean } {
  const final = Number(valorFinal);
  if (Number.isFinite(final) && final > 0) {
    return { valor: final, usouFallback: false };
  }
  const original = Number(valorOriginal);
  if (Number.isFinite(original) && original > 0) {
    return { valor: original, usouFallback: true };
  }
  return { valor: 0, usouFallback: false };
}

export function isRenovacaoOrigem(
  origem: string | null | undefined
): boolean {
  return origem === "renovacao";
}

/**
 * Contratos/orçamentos encerrados ou cancelados NÃO entram nos totais comerciais ativos.
 * Centraliza a regra da Gestão Comercial.
 */
export function isContratoContabilizavel(params: {
  statusContrato?: string | null;
  orcamentoStatus?: string | null;
}): boolean {
  return !isContratoEncerradoOuCancelado(params);
}

export function isContratoEncerradoOuCancelado(params: {
  statusContrato?: string | null;
  orcamentoStatus?: string | null;
}): boolean {
  const contrato = (params.statusContrato ?? "").trim().toLowerCase();
  const orcamento = (params.orcamentoStatus ?? "").trim().toLowerCase();

  if (contrato === "encerrado" || contrato === "cancelado") return true;
  if (orcamento === "contrato_encerrado" || orcamento === "cancelado") {
    return true;
  }
  return false;
}

/** @deprecated Prefer isContratoEncerradoOuCancelado / isContratoContabilizavel */
export function isContratoEncerradoStatus(
  status: string | null | undefined,
  orcamentoStatus?: string | null
): boolean {
  return isContratoEncerradoOuCancelado({
    statusContrato: status,
    orcamentoStatus,
  });
}

export function isContratoAtivoStatus(
  status: string | null | undefined,
  orcamentoStatus?: string | null
): boolean {
  return isContratoContabilizavel({
    statusContrato: status,
    orcamentoStatus,
  });
}

function toDateOnlyIso(iso: string): string {
  return iso.slice(0, 10);
}

function inRange(dateIso: string, inicio: string, fim: string): boolean {
  const d = toDateOnlyIso(dateIso);
  return d >= inicio && d <= fim;
}

export function rangeMes(ano: number, mes: number): { inicio: string; fim: string } {
  const m = String(mes).padStart(2, "0");
  const last = new Date(ano, mes, 0).getDate();
  return {
    inicio: `${ano}-${m}-01`,
    fim: `${ano}-${m}-${String(last).padStart(2, "0")}`,
  };
}

export function rangeAno(ano: number): { inicio: string; fim: string } {
  return { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };
}

export function mesAnterior(ano: number, mes: number): { ano: number; mes: number } {
  if (mes <= 1) return { ano: ano - 1, mes: 12 };
  return { ano, mes: mes - 1 };
}

export function calcComparacaoMes(
  valorAtual: number,
  valorAnterior: number
): GestaoComercialComparacao {
  const diferenca = valorAtual - valorAnterior;
  if (valorAnterior === 0) {
    return {
      valorAtual,
      valorAnterior,
      diferenca,
      percentual: null,
      tendencia: "sem_base",
      label: "Sem base de comparação no mês anterior.",
    };
  }
  const percentual = (diferenca / valorAnterior) * 100;
  if (Math.abs(diferenca) < 0.005) {
    return {
      valorAtual,
      valorAnterior,
      diferenca: 0,
      percentual: 0,
      tendencia: "igual",
      label: "0% em relação ao mês anterior",
    };
  }
  const sinal = percentual > 0 ? "+" : "";
  return {
    valorAtual,
    valorAnterior,
    diferenca,
    percentual,
    tendencia: percentual > 0 ? "alta" : "baixa",
    label: `${sinal}${percentual.toFixed(0)}% em relação ao mês anterior`,
  };
}

function sumValor(rows: GestaoComercialFechamentoRow[]): number {
  return rows.reduce((s, r) => s + r.valorFechado, 0);
}

function ticket(rows: GestaoComercialFechamentoRow[]): number {
  if (rows.length === 0) return 0;
  return sumValor(rows) / rows.length;
}

function grupoFrom(
  rows: GestaoComercialFechamentoRow[],
  chave: string,
  label: string,
  totalValor: number
): GestaoComercialGrupoResumo {
  const valorFechado = sumValor(rows);
  return {
    chave,
    label,
    quantidade: rows.length,
    valorFechado,
    ticketMedio: ticket(rows),
    percentualValor: totalValor > 0 ? (valorFechado / totalValor) * 100 : 0,
  };
}

export function filterFechamentos(
  rows: GestaoComercialFechamentoRow[],
  filters: GestaoComercialFilters,
  range: { inicio: string; fim: string },
  options?: { ignoreStatusFilter?: boolean }
): GestaoComercialFechamentoRow[] {
  return rows.filter((row) => {
    if (!inRange(row.aprovadoEm, range.inicio, range.fim)) return false;
    if (
      filters.responsavel &&
      row.responsavelNoFechamento !== filters.responsavel
    ) {
      return false;
    }
    if (filters.origem && row.origem !== filters.origem) return false;
    if (filters.tipo === "renovacao" && !isRenovacaoOrigem(row.origem)) {
      return false;
    }
    if (filters.tipo === "novo" && isRenovacaoOrigem(row.origem)) {
      return false;
    }
    if (!options?.ignoreStatusFilter) {
      const contabilizavel = isContratoContabilizavel({
        statusContrato: row.statusContrato,
        orcamentoStatus: row.orcamentoStatus,
      });
      if (filters.statusContrato === "ativos" && !contabilizavel) return false;
      if (filters.statusContrato === "encerrados" && contabilizavel) return false;
      // "todos" → sem filtro de status
    }
    return true;
  });
}

export function buildGestaoComercialDashboard(
  allRows: GestaoComercialFechamentoRow[],
  filters: GestaoComercialFilters
): GestaoComercialDashboard {
  const ano = filters.ano;
  const mesRef = filters.mes ?? new Date().getMonth() + 1;

  let rangeCards: { inicio: string; fim: string };
  if (filters.usarPeriodoPersonalizado && filters.periodoInicio && filters.periodoFim) {
    rangeCards = {
      inicio: filters.periodoInicio,
      fim: filters.periodoFim,
    };
  } else {
    rangeCards = rangeMes(ano, mesRef);
  }

  const rows = filterFechamentos(allRows, filters, rangeCards);
  const valorFechado = sumValor(rows);
  const contratosFechados = rows.length;
  const renovacoesRows = rows.filter((r) => isRenovacaoOrigem(r.origem));
  const novosRows = rows.filter((r) => !isRenovacaoOrigem(r.origem));

  // Card separado: sempre a qtd de encerrados/cancelados no período (demais filtros).
  const noPeriodo = filterFechamentos(allRows, filters, rangeCards, {
    ignoreStatusFilter: true,
  });
  const encerrados = noPeriodo.filter((r) =>
    isContratoEncerradoOuCancelado({
      statusContrato: r.statusContrato,
      orcamentoStatus: r.orcamentoStatus,
    })
  ).length;
  const ativos = noPeriodo.filter((r) =>
    isContratoContabilizavel({
      statusContrato: r.statusContrato,
      orcamentoStatus: r.orcamentoStatus,
    })
  ).length;

  const ant = mesAnterior(ano, mesRef);
  const rangeAnt = rangeMes(ant.ano, ant.mes);
  const rowsAnt = filterFechamentos(allRows, filters, rangeAnt);
  const comparacao = calcComparacaoMes(valorFechado, sumValor(rowsAnt));

  const rangeAnoFull = rangeAno(ano);
  const rowsAno = filterFechamentos(allRows, filters, rangeAnoFull);
  const serieMensalAno: GestaoComercialSerieMes[] = MESES_PT.map((label, idx) => {
    const mes = idx + 1;
    const { inicio, fim } = rangeMes(ano, mes);
    const doMes = rowsAno.filter((r) => inRange(r.aprovadoEm, inicio, fim));
    const now = new Date();
    if (ano === now.getFullYear() && mes > now.getMonth() + 1) {
      return {
        mes,
        label,
        valorFechado: 0,
        quantidade: 0,
        ticketMedio: 0,
      };
    }
    return {
      mes,
      label,
      valorFechado: sumValor(doMes),
      quantidade: doMes.length,
      ticketMedio: ticket(doMes),
    };
  }).filter((s) => {
    const now = new Date();
    if (ano < now.getFullYear()) return true;
    if (ano > now.getFullYear()) return false;
    return s.mes <= now.getMonth() + 1;
  });

  const origemMap = new Map<string, GestaoComercialFechamentoRow[]>();
  for (const row of rows) {
    const key = row.origem ?? "__null__";
    const list = origemMap.get(key) ?? [];
    list.push(row);
    origemMap.set(key, list);
  }
  const porOrigem = Array.from(origemMap.entries())
    .map(([chave, list]) =>
      grupoFrom(
        list,
        chave,
        formatOrcamentoOrigemCliente(chave === "__null__" ? null : chave),
        valorFechado
      )
    )
    .sort((a, b) => b.valorFechado - a.valorFechado);

  const respMap = new Map<string, GestaoComercialFechamentoRow[]>();
  for (const row of rows) {
    const key = row.responsavelNoFechamento || "Não informado";
    const list = respMap.get(key) ?? [];
    list.push(row);
    respMap.set(key, list);
  }
  const porResponsavel = Array.from(respMap.entries())
    .map(([chave, list]) => grupoFrom(list, chave, chave, valorFechado))
    .sort((a, b) => b.valorFechado - a.valorFechado);

  const avista = rows.filter((r) => r.formaPagamento === "avista");
  const parcelado = rows.filter((r) => r.formaPagamento === "parcelado");

  return {
    filtrosEfetivos: {
      inicio: rangeCards.inicio,
      fim: rangeCards.fim,
      mesRef,
      anoRef: ano,
    },
    rows: [...rows].sort((a, b) => b.aprovadoEm.localeCompare(a.aprovadoEm)),
    valorFechado,
    contratosFechados,
    ticketMedio: ticket(rows),
    novosClientes: novosRows.length,
    renovacoes: renovacoesRows.length,
    contratosEncerrados: encerrados,
    contratosAtivos: ativos,
    comparacao,
    serieMensalAno,
    porOrigem,
    porResponsavel,
    novosVsRenovacao: {
      novos: grupoFrom(novosRows, "novo", "Novos clientes", valorFechado),
      renovacoes: grupoFrom(
        renovacoesRows,
        "renovacao",
        "Renovações",
        valorFechado
      ),
    },
    pagamento: {
      avistaQtd: avista.length,
      parceladoQtd: parcelado.length,
      avistaValor: sumValor(avista),
      parceladoValor: sumValor(parcelado),
    },
  };
}

export function formatComparacaoDiferenca(comp: GestaoComercialComparacao): string {
  if (comp.tendencia === "sem_base") return "—";
  const sinal = comp.diferenca > 0 ? "+" : "";
  return `${sinal}${formatCurrency(comp.diferenca)}`;
}
