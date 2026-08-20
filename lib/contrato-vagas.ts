/**
 * Vagas previstas no contrato (1 linha = 1 colaborador contratado).
 * Fonte de identidade: quem ocupa cada vaga. ASO em aberto e agendamentos
 * continuam em contrato_creditos_aso / contrato_agendamentos.
 */

import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";

export const CONTRATO_VAGA_STATUSES = [
  "aberta",
  "comprometida",
  "aso_aberto",
  "agendada",
  "programada",
] as const;

export type ContratoVagaStatus = (typeof CONTRATO_VAGA_STATUSES)[number];

export const CONTRATO_VAGA_STATUS_LABELS: Record<ContratoVagaStatus, string> = {
  aberta: "Em aberto",
  comprometida: "Comprometido",
  aso_aberto: "ASO em aberto",
  agendada: "Agendado",
  programada: "Programado",
};

export type ContratoVagaRecord = {
  id: string;
  contrato_id: string;
  orcamento_id: string | null;
  indice: number;
  colaborador: string | null;
  colaborador_cpf: string | null;
  cargo_id: string | null;
  cargo_nome: string | null;
  status: ContratoVagaStatus;
  credito_aso_id: string | null;
  agendamento_id: string | null;
  periodico_futuro_id: string | null;
  created_at: string;
  updated_at: string;
  contrato_numero?: string | null;
};

export type ContratoVagaDraft = {
  id: string | null;
  indice: number;
  colaborador: string;
  colaboradorCpf: string;
  cargoId: string | null;
  cargoNome: string;
  manterAsoAberto: boolean;
};

const NOMES_NAO_REAIS = new Set([
  "a definir",
  "a definir.",
  "adefinir",
  "n/a",
  "na",
  "nao informado",
  "não informado",
  "-",
  "–",
  "—",
]);

export function isContratoVagaStatus(
  value: string
): value is ContratoVagaStatus {
  return (CONTRATO_VAGA_STATUSES as readonly string[]).includes(value);
}

export function normalizeNomeOcupante(
  value: string | null | undefined
): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function isNomeFuncionarioReal(
  value: string | null | undefined
): boolean {
  const nome = normalizeNomeOcupante(value);
  if (!nome) return false;
  const key = nome
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!key) return false;
  if (NOMES_NAO_REAIS.has(key)) return false;
  return true;
}

export function vagaTemOcupanteIdentificado(vaga: {
  colaborador?: string | null;
  colaborador_cpf?: string | null;
}): boolean {
  const cpf = normalizeCpfDigits(vaga.colaborador_cpf);
  return isNomeFuncionarioReal(vaga.colaborador) && isValidCPF(cpf);
}

export function vagaStatusBloqueiaEdicao(status: ContratoVagaStatus): boolean {
  return status === "agendada" || status === "programada";
}

export function resolveStatusVagaRascunho(input: {
  statusAtual?: ContratoVagaStatus | null;
  colaborador: string;
  colaboradorCpf: string;
  manterAsoAberto: boolean;
}): ContratoVagaStatus {
  if (
    input.statusAtual === "agendada" ||
    input.statusAtual === "programada"
  ) {
    return input.statusAtual;
  }
  if (
    isNomeFuncionarioReal(input.colaborador) &&
    isValidCPF(input.colaboradorCpf)
  ) {
    return "comprometida";
  }
  if (input.manterAsoAberto) return "aso_aberto";
  return "aberta";
}

export function emptyVagaDraft(indice: number): ContratoVagaDraft {
  return {
    id: null,
    indice,
    colaborador: "",
    colaboradorCpf: "",
    cargoId: null,
    cargoNome: "",
    manterAsoAberto: false,
  };
}

export function vagaToDraft(vaga: ContratoVagaRecord): ContratoVagaDraft {
  return {
    id: vaga.id,
    indice: vaga.indice,
    colaborador: vaga.colaborador ?? "",
    colaboradorCpf: vaga.colaborador_cpf ?? "",
    cargoId: vaga.cargo_id,
    cargoNome: vaga.cargo_nome ?? "",
    manterAsoAberto: vaga.status === "aso_aberto",
  };
}

export function buildVagaDraftsIniciais(
  quantidadePrevista: number,
  existentes: ContratoVagaRecord[]
): ContratoVagaDraft[] {
  const n = Math.max(0, Math.floor(Number(quantidadePrevista) || 0));
  const byIndice = new Map(existentes.map((v) => [v.indice, v]));
  const extras = existentes
    .filter((v) => v.indice > n)
    .sort((a, b) => a.indice - b.indice);

  const rows: ContratoVagaDraft[] = [];
  for (let i = 1; i <= n; i += 1) {
    const found = byIndice.get(i);
    rows.push(found ? vagaToDraft(found) : emptyVagaDraft(i));
  }
  for (const extra of extras) {
    rows.push(vagaToDraft(extra));
  }
  return rows;
}

export function contarVagasComprometidas(
  vagas: Array<Pick<ContratoVagaRecord, "status">>
): number {
  return vagas.filter((v) => v.status === "comprometida").length;
}

export function validarDraftsListaVagas(
  drafts: ContratoVagaDraft[],
  quantidadePrevista: number
): string | null {
  const n = Math.max(0, Math.floor(Number(quantidadePrevista) || 0));
  if (drafts.length > n) {
    return "A lista possui mais funcionários do que a quantidade prevista no contrato.";
  }

  const cpfIndice = new Map<string, number>();
  for (const row of drafts) {
    const status = resolveStatusVagaRascunho({
      colaborador: row.colaborador,
      colaboradorCpf: row.colaboradorCpf,
      manterAsoAberto: row.manterAsoAberto,
    });
    if (status !== "comprometida") continue;
    const cpf = normalizeCpfDigits(row.colaboradorCpf);
    const prev = cpfIndice.get(cpf);
    if (prev) {
      return `O CPF ${row.colaboradorCpf || cpf} está em mais de uma vaga deste contrato (linhas ${prev} e ${row.indice}).`;
    }
    cpfIndice.set(cpf, row.indice);

    if (!isNomeFuncionarioReal(row.colaborador)) {
      return `Informe o nome do funcionário na vaga ${row.indice}.`;
    }
    if (!isValidCPF(cpf)) {
      return `Informe um CPF válido na vaga ${row.indice}.`;
    }
  }

  for (const row of drafts) {
    const cpf = normalizeCpfDigits(row.colaboradorCpf);
    const temNome = isNomeFuncionarioReal(row.colaborador);
    const temCpf = cpf.length > 0;
    if (temCpf && !isValidCPF(cpf)) {
      return `CPF inválido na vaga ${row.indice}.`;
    }
    if (temNome && !temCpf) {
      return `Informe o CPF do funcionário na vaga ${row.indice}. O CPF é o identificador da vaga.`;
    }
    if (temCpf && !temNome) {
      return `Informe o nome do funcionário na vaga ${row.indice}.`;
    }
  }

  return null;
}

export function labelColaboradorOuVaga(vaga: {
  indice: number;
  colaborador?: string | null;
  status: ContratoVagaStatus;
}): string {
  if (vaga.status === "aso_aberto" && !isNomeFuncionarioReal(vaga.colaborador)) {
    return `Vaga ${vaga.indice}`;
  }
  if (isNomeFuncionarioReal(vaga.colaborador)) {
    return normalizeNomeOcupante(vaga.colaborador);
  }
  return `Vaga ${vaga.indice}`;
}
