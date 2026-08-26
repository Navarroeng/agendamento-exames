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

/** Data da obrigação periódica (não a data do agendamento de cumprimento). */
export function dataCicloPeriodico(
  record: Pick<
    PeriodicoFuturoRecord,
    "proxima_data" | "data_prevista_original" | "status"
  >
): string {
  const original = String(record.data_prevista_original ?? "").slice(0, 10);
  const proxima = String(record.proxima_data ?? "").slice(0, 10);
  if (
    record.status === "reagendado" &&
    /^\d{4}-\d{2}-\d{2}$/.test(original)
  ) {
    return original;
  }
  return proxima;
}

/** Data do agendamento que antecipa/cumpre o periódico, se houver. */
export function dataAgendadaPeriodico(
  record: Pick<
    PeriodicoFuturoRecord,
    | "status"
    | "proxima_data"
    | "data_prevista_original"
    | "data_agendada"
    | "agendamento_vinculado_id"
  >
): string | null {
  const direta = String(record.data_agendada ?? "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direta)) return direta;
  if (record.status !== "reagendado") return null;
  const original = String(record.data_prevista_original ?? "").slice(0, 10);
  const proxima = String(record.proxima_data ?? "").slice(0, 10);
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(proxima) &&
    original &&
    proxima !== original
  ) {
    return proxima;
  }
  return null;
}

export function buildPatchVinculoPeriodico(params: {
  agendamentoId: string;
  dataAgendamentoIso?: string | null;
  dataPrevistaOriginal: string;
}): {
  antecipado: boolean;
  patch: {
    agendamento_vinculado_id: string;
    status: "reagendado";
    data_prevista_original: string;
    antecipado: boolean;
  };
} {
  const dataPrevista = params.dataPrevistaOriginal.slice(0, 10);
  const antecipado = (() => {
    const ag = (params.dataAgendamentoIso ?? "").slice(0, 10);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(ag) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dataPrevista)
    ) {
      return false;
    }
    return ag < dataPrevista;
  })();
  return {
    antecipado,
    patch: {
      agendamento_vinculado_id: params.agendamentoId,
      status: "reagendado",
      data_prevista_original: dataPrevista,
      antecipado,
    },
  };
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
      return "Agendamento criado";
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
  const ciclo = dataCicloPeriodico(record);
  const agendado = dataAgendadaPeriodico(record);
  return {
    ...record,
    displayStatus,
    dataRealizadaBR: record.data_realizada
      ? formatDateBR(record.data_realizada)
      : "—",
    proximaDataBR: ciclo ? formatDateBR(ciclo) : "—",
    agendadoParaBR: agendado ? formatDateBR(agendado) : "—",
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

/**
 * `status` vazio (Todos) = obrigações operacionais, sem cancelados.
 * `status = cancelado` = somente o histórico cancelado.
 */
export function periodicoAtendeFiltroStatus(
  displayStatus: PeriodicoFuturoDisplayStatus,
  filtroStatus: string | null | undefined
): boolean {
  const status = (filtroStatus ?? "").trim();
  if (status) return displayStatus === status;
  return displayStatus !== "cancelado";
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

    if (!periodicoAtendeFiltroStatus(record.displayStatus, filters.status)) {
      return false;
    }

    if (filters.mesReferencia.trim()) {
      const mesIso = mesReferenciaIsoFromBR(filters.mesReferencia);
      if (mesIso) {
        const proxima = dataCicloPeriodico(record);
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
  return filterByEtapaEntradaMes(records, (r) => dataCicloPeriodico(r), mes);
}

/** Anos presentes em `proxima_data` (sem limitar ao ano civil atual). */
/** Anos presentes na data da obrigação periódica. */
export function extractPeriodicoAnos(
  records: Pick<
    PeriodicoFuturoRecord,
    "proxima_data" | "data_prevista_original" | "status"
  >[]
): number[] {
  const years = new Set<number>();
  for (const record of records) {
    const ym = yearMonthFromIsoDate(dataCicloPeriodico(record));
    if (ym) years.add(ym.year);
  }
  return Array.from(years).sort((a, b) => a - b);
}

/** Anos do seletor: existentes nos registros + ano atual (fallback de UI). */
export function listPeriodicoAnosDisponiveis(
  records: Pick<
    PeriodicoFuturoRecord,
    "proxima_data" | "data_prevista_original" | "status"
  >[],
  now: Date = new Date()
): number[] {
  return mergeAnosComAtual(extractPeriodicoAnos(records), now);
}

/** Contagem por ano civil da obrigação periódica. */
export function countPeriodicosPorAno(
  records: Pick<
    PeriodicoFuturoRecord,
    "proxima_data" | "data_prevista_original" | "status"
  >[]
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const record of records) {
    const ym = yearMonthFromIsoDate(dataCicloPeriodico(record));
    if (!ym) continue;
    counts[ym.year] = (counts[ym.year] || 0) + 1;
  }
  return counts;
}

/**
 * Período inicial da página: ano civil atual + Todos os meses.
 * Não usa o mês de `new Date()` como aba ativa.
 */
export function resolveInitialMesPeriodicos(
  now: Date = new Date()
): ListagemPeriodoSelecionado {
  return { year: getNowYearMonth(now).year, month: null };
}

const PERIODICO_STATUS_FILTRO: ReadonlyArray<PeriodicoFuturoDisplayStatus> = [
  "vencido",
  "vence_30_dias",
  "em_dia",
  "reagendado",
  "cancelado",
];

function isPeriodicoDisplayStatus(
  value: string
): value is PeriodicoFuturoDisplayStatus {
  return PERIODICO_STATUS_FILTRO.includes(
    value as PeriodicoFuturoDisplayStatus
  );
}

/** Hidrata mês/status já existentes a partir da query string (Dashboard). */
export function periodicoViewFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
  now: Date = new Date()
): {
  mesSelecionado: ListagemPeriodoSelecionado;
  activeCard: PeriodicoFuturoDisplayStatus | "";
} {
  const fallback = resolveInitialMesPeriodicos(now);
  const anoRaw = searchParams.get("ano")?.trim() ?? "";
  const mesRaw = searchParams.get("mes")?.trim() ?? "";
  const ano = Number(anoRaw);

  let mesSelecionado = fallback;
  if (anoRaw && Number.isInteger(ano) && ano >= 1900 && ano <= 2100) {
    if (!mesRaw || mesRaw === "todos") {
      mesSelecionado = { year: ano, month: null };
    } else {
      const mes = Number(mesRaw);
      if (Number.isInteger(mes) && mes >= 1 && mes <= 12) {
        mesSelecionado = { year: ano, month: mes };
      } else {
        mesSelecionado = { year: ano, month: null };
      }
    }
  }

  const status = searchParams.get("status")?.trim() ?? "";
  const activeCard = isPeriodicoDisplayStatus(status) ? status : "";

  return { mesSelecionado, activeCard };
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
