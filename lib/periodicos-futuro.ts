import { computeProximaDataPeriodico } from "@/lib/cargo-periodico";
import { mesReferenciaIsoFromBR } from "@/lib/duplicidade-validations";
import { formatDateBR } from "@/lib/format";
import type {
  PeriodicoFuturoDisplayStatus,
  PeriodicoFuturoFilters,
  PeriodicoFuturoRecord,
  PeriodicoFuturoRow,
  PeriodicoFuturoStoredStatus,
} from "@/lib/types";

export const PERIODICO_FUTURO_MESES = 6;

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
  record: Pick<PeriodicoFuturoRecord, "proxima_data" | "status">,
  referenceDate = todayIso()
): PeriodicoFuturoDisplayStatus {
  if (record.status === "reagendado") return "reagendado";
  if (record.status === "cancelado") return "cancelado";

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
    dataRealizadaBR: formatDateBR(record.data_realizada),
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
