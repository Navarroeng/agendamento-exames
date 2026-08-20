import { labelOrigemPeriodico } from "@/lib/contrato-programacao-futura";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import {
  canEditarProximaDataPeriodico,
  toPeriodicoFuturoRow,
} from "@/lib/periodicos-futuro";
import type {
  PeriodicoFuturoDisplayStatus,
  PeriodicoFuturoFilters,
  PeriodicoFuturoRecord,
  PeriodicoFuturoRow,
} from "@/lib/types";

export type PeriodicoFuturoGrupo = PeriodicoFuturoRow & {
  grupoKey: string;
  ids: string[];
  examesNomes: string[];
  examesLabel: string;
  examesTitulo: string;
  temCpf: boolean;
  temAcaoAtiva: boolean;
  podeEditarProximaData: boolean;
};

const STATUS_URGENCIA: Record<PeriodicoFuturoDisplayStatus, number> = {
  vencido: 0,
  vence_30_dias: 1,
  reagendado: 2,
  em_dia: 3,
  cancelado: 4,
};

export function normalizeIdentidadeColaborador(
  value: string | null | undefined
): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function periodicoTemCpf(
  record: Pick<PeriodicoFuturoRecord, "colaborador_cpf">
): boolean {
  return isValidCPF(record.colaborador_cpf);
}

export function chaveColaboradorPeriodico(
  record: Pick<
    PeriodicoFuturoRecord,
    "colaborador_cpf" | "cliente_nome" | "colaborador" | "cargo_id" | "cargo_nome"
  >
): string {
  const cpf = normalizeCpfDigits(record.colaborador_cpf);
  if (isValidCPF(cpf)) return `cpf:${cpf}`;

  const empresa = normalizeIdentidadeColaborador(record.cliente_nome);
  const nome = normalizeIdentidadeColaborador(record.colaborador);
  const cargo = record.cargo_id?.trim()
    ? `id:${record.cargo_id.trim()}`
    : `nome:${normalizeIdentidadeColaborador(record.cargo_nome)}`;
  return `legado:${empresa}|${nome}|${cargo}`;
}

export function chaveCicloPeriodico(
  record: Pick<
    PeriodicoFuturoRecord,
    | "colaborador_cpf"
    | "cliente_nome"
    | "colaborador"
    | "cargo_id"
    | "cargo_nome"
    | "proxima_data"
  >
): string {
  const data = String(record.proxima_data ?? "").split("T")[0];
  return `${chaveColaboradorPeriodico(record)}|${data}`;
}

export function isExameClinico(nome: string | null | undefined): boolean {
  return normalizeIdentidadeColaborador(nome) === "clinico";
}

export function formatarExamesGrupo(nomes: string[]): {
  label: string;
  titulo: string;
  principal: string;
  nomes: string[];
} {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of nomes) {
    const nome = raw.trim();
    if (!nome) continue;
    const key = normalizeIdentidadeColaborador(nome);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(nome);
  }
  if (unique.length === 0) {
    return { label: "—", titulo: "—", principal: "—", nomes: [] };
  }
  const principal =
    unique.find((nome) => isExameClinico(nome)) ?? unique[0];
  const extras = unique.length - 1;
  return {
    principal,
    nomes: unique,
    label: extras > 0 ? `${principal} + ${extras}` : principal,
    titulo: unique.join(", "),
  };
}

function escolherRepresentante(
  records: PeriodicoFuturoRow[]
): PeriodicoFuturoRow {
  const ativos = records.filter((r) => r.status === "ativo");
  const base = ativos.length > 0 ? ativos : records;
  const comClinico = base.find((r) =>
    isExameClinico(r.exame_nome || r.tipo_exame || r.tipo_aso)
  );
  return comClinico ?? base[0];
}

function consolidarOrigem(records: PeriodicoFuturoRow[]): string {
  const labels = Array.from(
    new Set(records.map((item) => labelOrigemPeriodico(item.origem)))
  );
  return labels.length <= 1 ? labels[0] ?? "Agendamento" : labels.join(" + ");
}

function statusDoGrupo(
  records: PeriodicoFuturoRow[]
): PeriodicoFuturoDisplayStatus {
  let melhor = records[0]?.displayStatus ?? "em_dia";
  for (const record of records) {
    if (STATUS_URGENCIA[record.displayStatus] < STATUS_URGENCIA[melhor]) {
      melhor = record.displayStatus;
    }
  }
  return melhor;
}

export function agruparPeriodicosPorColaboradorCiclo(
  records: PeriodicoFuturoRow[]
): PeriodicoFuturoGrupo[] {
  const buckets = new Map<string, PeriodicoFuturoRow[]>();
  for (const record of records) {
    const key = chaveCicloPeriodico(record);
    const list = buckets.get(key);
    if (list) list.push(record);
    else buckets.set(key, [record]);
  }

  const grupos: PeriodicoFuturoGrupo[] = [];
  Array.from(buckets.entries()).forEach(([grupoKey, items]) => {
    const ordenados = [...items].sort((a, b) =>
      (a.exame_nome || "").localeCompare(b.exame_nome || "", "pt-BR")
    );
    const representante = escolherRepresentante(ordenados);
    const examesNomes = ordenados.map(
      (item) => item.exame_nome || item.tipo_exame
    );
    const formatado = formatarExamesGrupo(examesNomes);
    const displayStatus = statusDoGrupo(ordenados);
    grupos.push({
      ...representante,
      origem: consolidarOrigem(ordenados),
      displayStatus,
      grupoKey,
      ids: ordenados.map((item) => item.id),
      examesNomes: formatado.nomes,
      examesLabel: formatado.label,
      examesTitulo: formatado.titulo,
      temCpf: periodicoTemCpf(representante) || ordenados.some(periodicoTemCpf),
      temAcaoAtiva: ordenados.some((item) => item.status === "ativo"),
      podeEditarProximaData: ordenados.every(canEditarProximaDataPeriodico),
    });
  });

  return grupos.sort((a, b) => {
    const data = a.proxima_data.localeCompare(b.proxima_data);
    if (data !== 0) return data;
    return a.colaborador.localeCompare(b.colaborador, "pt-BR");
  });
}

export function filterPeriodicoGrupos(
  grupos: PeriodicoFuturoGrupo[],
  filters: PeriodicoFuturoFilters
): PeriodicoFuturoGrupo[] {
  return grupos.filter((grupo) => {
    if (filters.empresa && grupo.cliente_nome !== filters.empresa) return false;
    if (filters.colaborador && grupo.colaborador !== filters.colaborador) {
      return false;
    }
    if (filters.cargo && grupo.cargo_nome !== filters.cargo) return false;
    if (filters.exame) {
      const alvo = normalizeIdentidadeColaborador(filters.exame);
      const bate = grupo.examesNomes.some(
        (nome) => normalizeIdentidadeColaborador(nome) === alvo
      );
      if (!bate) return false;
    }
    if (filters.status && grupo.displayStatus !== filters.status) return false;
    return true;
  });
}

export function countPeriodicoGruposByDisplayStatus(
  grupos: PeriodicoFuturoGrupo[]
): Record<PeriodicoFuturoDisplayStatus, number> {
  const counts: Record<PeriodicoFuturoDisplayStatus, number> = {
    vencido: 0,
    vence_30_dias: 0,
    em_dia: 0,
    reagendado: 0,
    cancelado: 0,
  };
  for (const grupo of grupos) {
    counts[grupo.displayStatus] += 1;
  }
  return counts;
}

export function toPeriodicoGruposFromRecords(
  records: PeriodicoFuturoRecord[]
): PeriodicoFuturoGrupo[] {
  return agruparPeriodicosPorColaboradorCiclo(records.map(toPeriodicoFuturoRow));
}

export function nomesColaboradorEquivalentes(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const na = normalizeIdentidadeColaborador(a);
  const nb = normalizeIdentidadeColaborador(b);
  return Boolean(na) && na === nb;
}
