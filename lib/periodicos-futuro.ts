import { computeProximaDataPeriodico } from "@/lib/cargo-periodico";
import { mesReferenciaIsoFromBR } from "@/lib/duplicidade-validations";
import { filterByEtapaEntradaMes } from "@/lib/etapa-entrada";
import { formatDateBR } from "@/lib/format";
import {
  LISTAGEM_MES_VAZIO_MSG,
  getNowYearMonth,
  listMesAbasDoAno,
  mergeAnosComAtual,
  yearMonthFromIsoDate,
  type ListagemPeriodoSelecionado,
  type YearMonth,
} from "@/lib/listagem-meses";
import { isPeriodicoCanceladoManualmente } from "@/lib/periodico-cancelamento";
import type {
  PeriodicoFuturoDisplayStatus,
  PeriodicoFuturoFilters,
  PeriodicoFuturoRecord,
  PeriodicoFuturoRow,
  PeriodicoFuturoStoredStatus,
} from "@/lib/types";

export const PERIODICO_FUTURO_MESES = 6;
export const PERIODICO_MES_VAZIO_MSG = LISTAGEM_MES_VAZIO_MSG;

export const EMPTY_PERIODICO_FUTURO_FILTERS: PeriodicoFuturoFilters = {
  empresa: "",
  colaborador: "",
  cargo: "",
  exame: "",
  status: "",
  mesReferencia: "",
};

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function computeProximaData6m(dataRealizadaIso: string): string {
  return computeProximaDataPeriodico(dataRealizadaIso, PERIODICO_FUTURO_MESES);
}

export function computePeriodicoDisplayStatus(
  record: Pick<
    PeriodicoFuturoRecord,
    "proxima_data" | "status" | "cancelado_em" | "motivo_cancelamento"
  >,
  referenceDate = todayIso()
): PeriodicoFuturoDisplayStatus {
  if (isPeriodicoCanceladoManualmente(record)) return "cancelado";
  if (record.status === "reagendado") return "reagendado";

  const proxima = record.proxima_data.split("T")[0];
  const limite30 = addDaysToIsoDate(referenceDate, 30);

  if (proxima < referenceDate) return "vencido";
  if (proxima <= limite30) return "vence_30_dias";
  return "em_dia";
}

export function periodicoDisplayStatusLabel(
  status: PeriodicoFuturoDisplayStatus
): string {
  switch (status) {
    case "vencido":
      return "Vencido";
    case "vence_30_dias":
      return "Vence em 30 dias";
    case "em_dia":
      return "Em dia";
    case "reagendado":
      return "Reagendado";
    case "cancelado":
      return "Cancelado";
  }
}

export function periodicoDisplayStatusClass(
  status: PeriodicoFuturoDisplayStatus
): string {
  switch (status) {
    case "vencido":
      return "text-brand-red";
    case "vence_30_dias":
      return "text-[#b45309]";
    case "em_dia":
      return "text-brand-green";
    case "reagendado":
      return "text-brand-blue";
    case "cancelado":
      return "text-[#64748b]";
  }
}

export function toPeriodicoFuturoRow(
  record: PeriodicoFuturoRecord
): PeriodicoFuturoRow {
  const displayStatus = computePeriodicoDisplayStatus(record);
  return {
    ...record,
    displayStatus,
    dataRealizadaBR: record.data_realizada
      ? formatDateBR(record.data_realizada)
      : "—",
    proximaDataBR: formatDateBR(record.proxima_data),
  };
}

export function extractPeriodicoFilterOptions(
  records: PeriodicoFuturoRecord[]
): {
  empresas: string[];
  colaboradores: string[];
  cargos: string[];
  exames: string[];
} {
  const empresas = new Set<string>();
  const colaboradores = new Set<string>();
  const cargos = new Set<string>();
  const exames = new Set<string>();

  records.forEach((record) => {
    if (record.cliente_nome) empresas.add(record.cliente_nome);
    if (record.colaborador) colaboradores.add(record.colaborador);
    if (record.cargo_nome) cargos.add(record.cargo_nome);
    if (record.exame_nome) exames.add(record.exame_nome);
  });

  const sort = (values: Set<string>) =>
    Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    empresas: sort(empresas),
    colaboradores: sort(colaboradores),
    cargos: sort(cargos),
    exames: sort(exames),
  };
}

export function filterPeriodicosFuturos(
  records: PeriodicoFuturoRow[],
  filters: PeriodicoFuturoFilters
): PeriodicoFuturoRow[] {
  return records.filter((record) => {
    if (filters.empresa && record.cliente_nome !== filters.empresa) return false;
    if (filters.colaborador && record.colaborador !== filters.colaborador) {
      return false;
    }
    if (filters.cargo && record.cargo_nome !== filters.cargo) return false;
    if (filters.exame && record.exame_nome !== filters.exame) return false;

    if (filters.status) {
      if (record.displayStatus !== filters.status) return false;
    }

    if (filters.mesReferencia.trim()) {
      const mesIso = mesReferenciaIsoFromBR(filters.mesReferencia);
      if (mesIso) {
        const proxima = record.proxima_data.split("T")[0];
        if (proxima.slice(0, 7) !== mesIso) return false;
      }
    }

    return true;
  });
}

/**
 * Filtra pela Próxima Data do periódico (entrada/referência do módulo).
 * `month: null` = todos os meses do ano selecionado.
 */
export function filterPeriodicosFuturosPorMes(
  records: PeriodicoFuturoRow[],
  mes: ListagemPeriodoSelecionado
): PeriodicoFuturoRow[] {
  return filterByEtapaEntradaMes(records, (r) => r.proxima_data, mes);
}

/** Anos presentes em `proxima_data` (sem limitar ao ano civil atual). */
export function extractPeriodicoAnos(
  records: Pick<PeriodicoFuturoRecord, "proxima_data">[]
): number[] {
  const years = new Set<number>();
  for (const record of records) {
    const ym = yearMonthFromIsoDate(record.proxima_data);
    if (ym) years.add(ym.year);
  }
  return Array.from(years).sort((a, b) => a - b);
}

/** Anos do seletor: existentes nos registros + ano atual (fallback de UI). */
export function listPeriodicoAnosDisponiveis(
  records: Pick<PeriodicoFuturoRecord, "proxima_data">[],
  now: Date = new Date()
): number[] {
  return mergeAnosComAtual(extractPeriodicoAnos(records), now);
}

/** Contagem por ano civil da próxima data. */
export function countPeriodicosPorAno(
  records: Pick<PeriodicoFuturoRecord, "proxima_data">[]
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const record of records) {
    const ym = yearMonthFromIsoDate(record.proxima_data);
    if (!ym) continue;
    counts[ym.year] = (counts[ym.year] || 0) + 1;
  }
  return counts;
}

/**
 * Mês inicial: mês civil atual se o ano existir nos dados (ou na lista);
 * senão, primeiro ano com registros (janeiro).
 * Meses futuros NÃO são bloqueados neste módulo.
 */
export function resolveInitialMesPeriodicos(
  records: Pick<PeriodicoFuturoRecord, "proxima_data">[],
  now: Date = new Date()
): YearMonth {
  const current = getNowYearMonth(now);
  const anos = listPeriodicoAnosDisponiveis(records, now);
  if (anos.includes(current.year)) {
    return current;
  }
  const anosComDados = extractPeriodicoAnos(records);
  if (anosComDados.length > 0) {
    return { year: anosComDados[0], month: 1 };
  }
  return current;
}

/** 12 meses do ano (sempre janeiro–dezembro neste módulo). */
export function listPeriodicoMesAbas(year: number): YearMonth[] {
  return listMesAbasDoAno(year, 1);
}

export function countPeriodicosByDisplayStatus(
  records: PeriodicoFuturoRow[]
): Record<PeriodicoFuturoDisplayStatus, number> {
  const counts: Record<PeriodicoFuturoDisplayStatus, number> = {
    vencido: 0,
    vence_30_dias: 0,
    em_dia: 0,
    reagendado: 0,
    cancelado: 0,
  };

  records.forEach((record) => {
    counts[record.displayStatus] += 1;
  });

  return counts;
}

export function isPeriodicoActionable(
  status: PeriodicoFuturoStoredStatus
): boolean {
  return status === "ativo";
}

/** Oficial: coluna “Realizado em” (`data_realizada`). */
export function isPeriodicoRealizado(
  record: Pick<PeriodicoFuturoRecord, "data_realizada">
): boolean {
  return Boolean(record.data_realizada?.trim());
}

/** Editar próxima data só para ativo ainda sem exame realizado. */
export function canEditarProximaDataPeriodico(
  record: Pick<PeriodicoFuturoRecord, "status" | "data_realizada">
): boolean {
  return isPeriodicoActionable(record.status) && !isPeriodicoRealizado(record);
}
