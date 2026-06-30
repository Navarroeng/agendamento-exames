import { isValidMonthYearBR } from "@/lib/agendamento-datetime";
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
import type { AgendamentoWithExames, FaturaRecord } from "@/lib/types";

export type FaturaClienteMesStatus =
  | "aberta_emissao"
  | "rascunho"
  | "emitida"
  | "paga"
  | "em_aberto"
  | "cancelada";

export interface ClienteFaturaMesRow {
  clienteNome: string;
  periodoLabel: string;
  qtdAgendamentos: number;
  qtdExames: number;
  valorTotal: number;
  fatura: FaturaRecord | null;
  status: FaturaClienteMesStatus;
}

export interface FaturaMesResumoGeral {
  totalClientes: number;
  totalAgendamentos: number;
  totalExames: number;
  valorPrevisto: number;
  valorEmitido: number;
  valorPago: number;
  valorEmAberto: number;
}

export const FATURA_CLIENTE_MES_STATUS_LABELS: Record<
  FaturaClienteMesStatus,
  string
> = {
  aberta_emissao: "Aberta para emissão",
  rascunho: "Rascunho",
  emitida: "Emitida",
  paga: "Paga",
  em_aberto: "Em aberto",
  cancelada: "Cancelada",
};

export function getCurrentMonthYearBR(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${mm}/${now.getFullYear()}`;
}

function normalizeReferencia(value: string): string {
  return value.trim().toLowerCase();
}

export function deriveClienteMesStatus(
  fatura: FaturaRecord | null
): FaturaClienteMesStatus {
  if (!fatura) return "aberta_emissao";
  if (fatura.status === "cancelada") return "cancelada";
  if (fatura.status === "rascunho") return "rascunho";
  if (fatura.status === "emitida") {
    return fatura.pago ? "paga" : "em_aberto";
  }
  return "emitida";
}

export function findFaturaClienteMes(
  faturas: FaturaRecord[],
  clienteNome: string,
  mesReferencia: string
): FaturaRecord | null {
  const matches = faturas.filter(
    (f) =>
      f.tipo === "cliente" &&
      normalizeReferencia(f.referencia_nome) ===
        normalizeReferencia(clienteNome) &&
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

/** Ordem alfabética por nome do cliente (pt-BR, sem diferenciar maiúsculas). */
export function compareClienteFaturaMesNomeAsc(
  a: Pick<ClienteFaturaMesRow, "clienteNome">,
  b: Pick<ClienteFaturaMesRow, "clienteNome">
): number {
  return a.clienteNome.localeCompare(b.clienteNome, "pt-BR", {
    sensitivity: "base",
  });
}

export function buildResumoClientesMes(
  agendamentos: AgendamentoWithExames[],
  faturas: FaturaRecord[],
  mesReferencia: string,
  clienteFilter = ""
): { rows: ClienteFaturaMesRow[]; resumo: FaturaMesResumoGeral } | null {
  if (!isValidMonthYearBR(mesReferencia)) return null;

  const filters: FaturaFilters = {
    ...EMPTY_FATURA_FILTERS,
    mesReferencia,
    cliente: clienteFilter,
  };
  const agsDoMes = filterAgendamentosFatura(agendamentos, filters);
  const byCliente = new Map<string, AgendamentoWithExames[]>();

  agsDoMes.forEach((ag) => {
    const nome = ag.cliente_nome?.trim() || "—";
    const list = byCliente.get(nome) ?? [];
    list.push(ag);
    byCliente.set(nome, list);
  });

  const periodoLabel = formatPeriodoFatura(mesReferencia);
  const faturasCliente = faturas.filter((f) => f.tipo === "cliente");

  const rows: ClienteFaturaMesRow[] = Array.from(byCliente.entries()).map(
    ([clienteNome, ags]) => {
      const itens = buildFaturaItensFromAgendamentos(ags, "cliente");
      const fatura = findFaturaClienteMes(
        faturasCliente,
        clienteNome,
        mesReferencia
      );

      return {
        clienteNome,
        periodoLabel,
        qtdAgendamentos: ags.length,
        qtdExames: itens.length,
        valorTotal: calcTotalFaturaItens(itens),
        fatura,
        status: deriveClienteMesStatus(fatura),
      };
    }
  );

  rows.sort(compareClienteFaturaMesNomeAsc);

  let valorEmitido = 0;
  let valorPago = 0;
  let valorEmAberto = 0;

  rows.forEach((row) => {
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
    totalClientes: rows.length,
    totalAgendamentos: rows.reduce((s, r) => s + r.qtdAgendamentos, 0),
    totalExames: rows.reduce((s, r) => s + r.qtdExames, 0),
    valorPrevisto: rows.reduce((s, r) => s + r.valorTotal, 0),
    valorEmitido,
    valorPago,
    valorEmAberto,
  };

  return { rows, resumo };
}
