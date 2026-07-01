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
import type { AgendamentoWithExames, FaturaRecord, FaturaTipo } from "@/lib/types";

export type FaturaMesStatus =
  | "aberta_emissao"
  | "rascunho"
  | "emitida"
  | "paga"
  | "cancelada";

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

export function deriveFaturaMesStatus(
  fatura: FaturaRecord | null
): FaturaMesStatus {
  if (!fatura) return "aberta_emissao";
  if (fatura.status === "cancelada") return "cancelada";
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

  const active = matches.filter((f) => f.status !== "cancelada");
  const pool = active.length > 0 ? active : matches;

  const emitida = pool.find((f) => f.status === "emitida");
  if (emitida) return emitida;

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

/** Entra na listagem e no resumo previsto somente com valor > 0. */
export function isReferenciaFaturavelNoMes(valorTotal: number): boolean {
  return valorTotal > 0;
}

/** @deprecated Use isReferenciaFaturavelNoMes */
export const isClienteFaturavelNoMes = isReferenciaFaturavelNoMes;

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

  const rows: FaturaMesRow[] = Array.from(byReferencia.entries()).map(
    ([referenciaNome, ags]) => {
      const itens = buildFaturaItensFromAgendamentos(ags, tipo);
      const fatura = findFaturaReferenciaMes(
        faturasDoTipo,
        tipo,
        referenciaNome,
        mesReferencia
      );

      return {
        referenciaNome,
        periodoLabel,
        qtdAgendamentos: ags.length,
        qtdExames: itens.length,
        valorTotal: calcTotalFaturaItens(itens),
        fatura,
        status: deriveFaturaMesStatus(fatura),
      };
    }
  );

  const rowsFaturaveis = rows.filter((row) =>
    isReferenciaFaturavelNoMes(row.valorTotal)
  );

  rowsFaturaveis.sort(compareFaturaMesReferenciaAsc);

  let valorEmitido = 0;
  let valorPago = 0;
  let valorEmAberto = 0;

  rowsFaturaveis.forEach((row) => {
    if (!row.fatura || row.fatura.status !== "emitida") return;
    const valor = Number(row.fatura.valor_total);
    valorEmitido += valor;
    if (row.fatura.pago) {
      valorPago += valor;
    } else {
      valorEmAberto += valor;
    }
  });

  const resumo: FaturaMesResumoGeral = {
    totalReferencias: rowsFaturaveis.length,
    totalAgendamentos: rowsFaturaveis.reduce((s, r) => s + r.qtdAgendamentos, 0),
    totalExames: rowsFaturaveis.reduce((s, r) => s + r.qtdExames, 0),
    valorPrevisto: rowsFaturaveis.reduce((s, r) => s + r.valorTotal, 0),
    valorEmitido,
    valorPago,
    valorEmAberto,
  };

  return { rows: rowsFaturaveis, resumo };
}

export function buildResumoClientesMes(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  clienteFilter = ""
): { rows: ClienteFaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
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
  return buildResumoMesInterno(
    agendamentos,
    faturas,
    mesReferencia,
    "clinica",
    clinicaFilter,
    "clinica"
  );
}
