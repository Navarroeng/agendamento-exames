import { isValidMonthYearBR } from "@/lib/agendamento-datetime";
import { getCurrentMonthReferenceBR } from "@/lib/month-reference-options";
import {
  EMPTY_FATURA_FILTERS,
  faturaMatchesMesReferencia,
  filterAgendamentosFatura,
  formatPeriodoFatura,
  type FaturaFilters,
} from "@/lib/fatura-filters";
import {
  buildFaturaItensFromAgendamentos,
  calcTotalFaturaItens,
} from "@/lib/fatura-mappers";
import {
  FATURA_STATUS_INATIVOS,
  faturaStatusContaNoResumoEmitido,
  faturaStatusHistoricoInativo,
  mesReferenciaBRFromFatura,
} from "@/lib/fatura-reemissao";
import type { AgendamentoWithExames, FaturaRecord, FaturaTipo } from "@/lib/types";

export type FaturaMesStatus =
  | "aberta_emissao"
  | "rascunho"
  | "emitida"
  | "paga"
  | "cancelada"
  | "necessita_reemissao"
  | "substituida"
  | "reemitida";

/** @deprecated Use FaturaMesStatus */
export type FaturaClienteMesStatus = FaturaMesStatus;

export interface FaturaMesRow {
  referenciaNome: string;
  periodoLabel: string;
  qtdAgendamentos: number;
  qtdExames: number;
  valorTotal: number;
  fatura: FaturaRecord | null;
  status: FaturaMesStatus;
  alteracaoPosEmissao?: boolean;
}

/** @deprecated Use FaturaMesRow */
export interface ClienteFaturaMesRow extends FaturaMesRow {
  clienteNome: string;
}

export interface FaturaMesResumoGeral {
  totalReferencias: number;
  totalAgendamentos: number;
  totalExames: number;
  valorPrevisto: number;
  valorEmitido: number;
  valorPago: number;
  valorEmAberto: number;
}

export const FATURA_MES_STATUS_LABELS: Record<FaturaMesStatus, string> = {
  aberta_emissao: "Aberta para emissão",
  rascunho: "Rascunho",
  emitida: "Emitida",
  paga: "Paga",
  cancelada: "Cancelada",
  necessita_reemissao: "Necessita reemissão",
  substituida: "Substituída",
  reemitida: "Reemitida",
};

/** @deprecated Use FATURA_MES_STATUS_LABELS */
export const FATURA_CLIENTE_MES_STATUS_LABELS = FATURA_MES_STATUS_LABELS;

export { FATURA_MES_STATUS_LABELS_CLINICA } from "@/lib/custos-clinicas-conferencia";

export function getCurrentMonthYearBR(): string {
  return getCurrentMonthReferenceBR();
}

function normalizeReferencia(value: string): string {
  return value.trim().toLowerCase();
}

function matchesReferenciaFilter(nome: string, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  return nome.toLowerCase().includes(f);
}

export function deriveFaturaMesStatus(
  fatura: FaturaRecord | null
): FaturaMesStatus {
  if (!fatura) return "aberta_emissao";
  if (fatura.status === "cancelada") return "cancelada";
  if (fatura.status === "substituida") return "substituida";
  if (fatura.status === "reemitida") return "reemitida";
  if (fatura.status === "necessita_reemissao") return "necessita_reemissao";
  if (fatura.status === "rascunho") return "rascunho";
  if (fatura.status === "emitida") {
    return fatura.pago ? "paga" : "emitida";
  }
  return "emitida";
}

/** @deprecated Use deriveFaturaMesStatus */
export const deriveClienteMesStatus = deriveFaturaMesStatus;

export function findFaturaReferenciaMes(
  faturas: FaturaRecord[],
  tipo: FaturaTipo,
  referenciaNome: string,
  mesReferencia: string
): FaturaRecord | null {
  const matches = faturas.filter(
    (f) =>
      f.tipo === tipo &&
      normalizeReferencia(f.referencia_nome) ===
        normalizeReferencia(referenciaNome) &&
      faturaMatchesMesReferencia(f, mesReferencia)
  );

  if (matches.length === 0) return null;

  const active = matches.filter(
    (f) => !FATURA_STATUS_INATIVOS.includes(f.status)
  );
  const pool = active.length > 0 ? active : matches;

  const emitida = pool.find((f) => f.status === "emitida");
  if (emitida) return emitida;

  const necessita = pool.find((f) => f.status === "necessita_reemissao");
  if (necessita) return necessita;

  const rascunho = pool.find((f) => f.status === "rascunho");
  if (rascunho) return rascunho;

  return pool[0] ?? null;
}

/** @deprecated Use findFaturaReferenciaMes */
export function findFaturaClienteMes(
  faturas: FaturaRecord[],
  clienteNome: string,
  mesReferencia: string
): FaturaRecord | null {
  return findFaturaReferenciaMes(
    faturas,
    "cliente",
    clienteNome,
    mesReferencia
  );
}

/** Ordem alfabética por referência (pt-BR, sem diferenciar maiúsculas). */
export function compareFaturaMesReferenciaAsc(
  a: Pick<FaturaMesRow, "referenciaNome">,
  b: Pick<FaturaMesRow, "referenciaNome">
): number {
  return a.referenciaNome.localeCompare(b.referenciaNome, "pt-BR", {
    sensitivity: "base",
  });
}

/** @deprecated Use compareFaturaMesReferenciaAsc */
export const compareClienteFaturaMesNomeAsc = compareFaturaMesReferenciaAsc;

function compareFaturaMesRows(a: FaturaMesRow, b: FaturaMesRow): number {
  const byReferencia = compareFaturaMesReferenciaAsc(a, b);
  if (byReferencia !== 0) return byReferencia;

  const numA = a.fatura?.numero ?? "";
  const numB = b.fatura?.numero ?? "";
  if (numA && numB) {
    const byNumero = numA.localeCompare(numB, "pt-BR", { sensitivity: "base" });
    if (byNumero !== 0) return byNumero;
  }

  return a.periodoLabel.localeCompare(b.periodoLabel, "pt-BR", {
    sensitivity: "base",
  });
}

/** Entra na listagem aberta (sem fatura) somente com valor > 0. */
export function isReferenciaFaturavelNoMes(valorTotal: number): boolean {
  return valorTotal > 0;
}

/** Linha ativa exige ao menos um agendamento elegível no período. */
export function rowPossuiAgendamentosValidos(
  row: Pick<FaturaMesRow, "qtdAgendamentos">
): boolean {
  return row.qtdAgendamentos > 0;
}

function isRowAtivaNoResumo(row: FaturaMesRow): boolean {
  if (!rowPossuiAgendamentosValidos(row)) return false;
  if (row.fatura && faturaStatusHistoricoInativo(row.fatura.status)) {
    return false;
  }
  return true;
}

function filterRowsFaturaveis(rows: FaturaMesRow[]): FaturaMesRow[] {
  return rows.filter(isRowAtivaNoResumo);
}

export const PERIODO_COMPLETO_LABEL = "Todo o período";

/** @deprecated Use isReferenciaFaturavelNoMes */
export const isClienteFaturavelNoMes = isReferenciaFaturavelNoMes;

function buildMetricsFromAgendamentos(
  ags: AgendamentoWithExames[],
  tipo: FaturaTipo
): Pick<FaturaMesRow, "qtdAgendamentos" | "qtdExames" | "valorTotal"> {
  const itens = buildFaturaItensFromAgendamentos(ags, tipo);
  return {
    qtdAgendamentos: ags.length,
    qtdExames: itens.length,
    valorTotal: calcTotalFaturaItens(itens),
  };
}

function agendamentosReferenciaMes(
  agendamentos: AgendamentoWithExames[],
  mesReferencia: string,
  referenciaNome: string,
  referenciaField: "cliente" | "clinica"
): AgendamentoWithExames[] {
  const filters: FaturaFilters = {
    ...EMPTY_FATURA_FILTERS,
    mesReferencia,
    ...(referenciaField === "cliente"
      ? { cliente: referenciaNome }
      : { clinica: referenciaNome }),
  };
  return filterAgendamentosFatura(agendamentos, filters);
}

function buildRowFromFatura(
  fatura: FaturaRecord,
  agendamentos: AgendamentoWithExames[],
  mesReferencia: string,
  periodoLabel: string,
  tipo: FaturaTipo,
  referenciaField: "cliente" | "clinica"
): FaturaMesRow {
  const referenciaNome = fatura.referencia_nome.trim() || "—";
  const mesAgendamentos =
    mesReferencia.trim() || mesReferenciaBRFromFatura(fatura) || "";
  const ags = mesAgendamentos
    ? agendamentosReferenciaMes(
        agendamentos,
        mesAgendamentos,
        referenciaNome,
        referenciaField
      )
    : [];

  const metrics = buildMetricsFromAgendamentos(ags, tipo);

  return {
    referenciaNome,
    periodoLabel,
    qtdAgendamentos: metrics.qtdAgendamentos,
    qtdExames: metrics.qtdExames,
    valorTotal: metrics.valorTotal,
    fatura,
    status: deriveFaturaMesStatus(fatura),
  };
}

function computeResumo(rows: FaturaMesRow[]): FaturaMesResumoGeral {
  const referencias = new Set(
    rows.map((row) => normalizeReferencia(row.referenciaNome))
  );

  let valorEmitido = 0;
  let valorPago = 0;
  let valorEmAberto = 0;

  rows.forEach((row) => {
    if (!row.fatura || !faturaStatusContaNoResumoEmitido(row.fatura.status)) {
      return;
    }
    const valor = Number(row.valorTotal);
    valorEmitido += valor;
    if (row.fatura.pago) {
      valorPago += valor;
    } else {
      valorEmAberto += valor;
    }
  });

  const valorPrevisto = rows.reduce((sum, row) => {
    if (row.fatura && faturaStatusHistoricoInativo(row.fatura.status)) {
      return sum;
    }
    return sum + row.valorTotal;
  }, 0);

  return {
    totalReferencias: referencias.size,
    totalAgendamentos: rows.reduce((sum, row) => sum + row.qtdAgendamentos, 0),
    totalExames: rows.reduce((sum, row) => sum + row.qtdExames, 0),
    valorPrevisto,
    valorEmitido,
    valorPago,
    valorEmAberto,
  };
}

function buildResumoPeriodoCompleto(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  tipo: FaturaTipo,
  referenciaFilter: string,
  referenciaField: "cliente" | "clinica"
): { rows: FaturaMesRow[]; resumo: FaturaMesResumoGeral } {
  const faturasDoTipo = faturas.filter((f) => f.tipo === tipo);

  const rows = faturasDoTipo
    .filter((fatura) =>
      matchesReferenciaFilter(fatura.referencia_nome, referenciaFilter)
    )
    .map((fatura) => {
      const mesBR = mesReferenciaBRFromFatura(fatura) ?? "";
      const periodoLabel = mesBR
        ? formatPeriodoFatura(mesBR)
        : PERIODO_COMPLETO_LABEL;

      return buildRowFromFatura(
        fatura,
        agendamentos,
        mesBR,
        periodoLabel,
        tipo,
        referenciaField
      );
    });

  const rowsFaturaveis = filterRowsFaturaveis(rows);
  rowsFaturaveis.sort(compareFaturaMesRows);

  return { rows: rowsFaturaveis, resumo: computeResumo(rowsFaturaveis) };
}

function buildResumoMesInterno(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  tipo: FaturaTipo,
  referenciaFilter: string,
  referenciaField: "cliente" | "clinica"
): { rows: FaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  if (!isValidMonthYearBR(mesReferencia)) return null;

  const filters: FaturaFilters = {
    ...EMPTY_FATURA_FILTERS,
    mesReferencia,
    ...(referenciaField === "cliente"
      ? { cliente: referenciaFilter }
      : { clinica: referenciaFilter }),
  };
  const agsDoMes = filterAgendamentosFatura(agendamentos, filters);
  const byReferencia = new Map<string, AgendamentoWithExames[]>();

  agsDoMes.forEach((ag) => {
    const nome =
      (referenciaField === "cliente"
        ? ag.cliente_nome
        : ag.clinica_nome)?.trim() || "—";
    const list = byReferencia.get(nome) ?? [];
    list.push(ag);
    byReferencia.set(nome, list);
  });

  const periodoLabel = formatPeriodoFatura(mesReferencia);
  const faturasDoTipo = faturas.filter((f) => f.tipo === tipo);

  const faturasMes = faturasDoTipo.filter(
    (fatura) =>
      faturaMatchesMesReferencia(fatura, mesReferencia) &&
      matchesReferenciaFilter(fatura.referencia_nome, referenciaFilter)
  );

  const rowsFromFaturas = faturasMes.map((fatura) =>
    buildRowFromFatura(
      fatura,
      agendamentos,
      mesReferencia,
      periodoLabel,
      tipo,
      referenciaField
    )
  );

  const clientesComFatura = new Set(
    faturasMes.map((fatura) => normalizeReferencia(fatura.referencia_nome))
  );

  const rowsAbertas: FaturaMesRow[] = Array.from(byReferencia.entries())
    .filter(([referenciaNome]) => {
      return !clientesComFatura.has(normalizeReferencia(referenciaNome));
    })
    .map(([referenciaNome, ags]) => {
      const metrics = buildMetricsFromAgendamentos(ags, tipo);
      return {
        referenciaNome,
        periodoLabel,
        ...metrics,
        fatura: null,
        status: "aberta_emissao" as const,
      };
    })
    .filter((row) => isReferenciaFaturavelNoMes(row.valorTotal));

  const rows = filterRowsFaturaveis([...rowsFromFaturas, ...rowsAbertas]);
  rows.sort(compareFaturaMesRows);

  return { rows, resumo: computeResumo(rows) };
}

export function buildResumoClientesMes(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  clienteFilter = ""
): { rows: ClienteFaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  if (!mesReferencia.trim()) {
    const result = buildResumoPeriodoCompleto(
      agendamentos,
      faturas,
      "cliente",
      clienteFilter,
      "cliente"
    );
    return {
      resumo: result.resumo,
      rows: result.rows.map((row) => ({
        ...row,
        clienteNome: row.referenciaNome,
      })),
    };
  }

  const result = buildResumoMesInterno(
    agendamentos,
    faturas,
    mesReferencia,
    "cliente",
    clienteFilter,
    "cliente"
  );
  if (!result) return null;
  return {
    resumo: result.resumo,
    rows: result.rows.map((row) => ({
      ...row,
      clienteNome: row.referenciaNome,
    })),
  };
}

export function buildResumoClinicasMes(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  clinicaFilter = ""
): { rows: FaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  if (!mesReferencia.trim()) {
    return buildResumoPeriodoCompleto(
      agendamentos,
      faturas,
      "clinica",
      clinicaFilter,
      "clinica"
    );
  }

  return buildResumoMesInterno(
    agendamentos,
    faturas,
    mesReferencia,
    "clinica",
    clinicaFilter,
    "clinica"
  );
}

export function filterFaturaMesRowsByStatus(
  rows: FaturaMesRow[],
  status: string
): FaturaMesRow[] {
  const trimmed = status.trim();
  if (!trimmed) return rows;
  return rows.filter((row) => row.status === trimmed);
}

export function computeFaturaMesResumo(
  rows: FaturaMesRow[]
): FaturaMesResumoGeral {
  return computeResumo(rows);
}
