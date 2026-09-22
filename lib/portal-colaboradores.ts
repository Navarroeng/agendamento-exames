/**
 * Portal do Cliente — módulo Colaboradores.
 * Derivado de contrato_vagas (lista implantação) + agendamentos.
 * Sem tabela mestre nova. Identidade: cliente + CPF normalizado.
 *
 * Situações (fatos persistidos):
 * - Ativo: vaga / Admissional aso_retido / sem demissional concluído pendente
 * - Admissional em andamento: Admissional status=agendado (não cancelado)
 * - Demissional em andamento: Demissional status=agendado (não cancelado)
 * - Demitido: Demissional status=aso_retido sem Admissional posterior
 * Cancelados nunca alteram a situação.
 */

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { vagaTemOcupanteIdentificado } from "@/lib/contrato-vagas";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import { isAgendamentoCancelado } from "@/lib/contrato-agendamentos";
import { compareByLabel } from "@/lib/sort-by-label";

export type PortalColaboradorSituacao =
  | "ativo"
  | "admissional_em_andamento"
  | "demissional_em_andamento"
  | "demitido";

export type PortalColaboradoresFiltro = "todos" | "ativos" | "demitidos";

export type PortalColaboradorLinha = {
  id: string;
  cpfDigits: string;
  cpfMascarado: string;
  nome: string;
  cargo: string;
  situacao: PortalColaboradorSituacao;
  situacaoLabel: string;
  dataAdmissaoIso: string | null;
  dataAdmissaoLabel: string | null;
  dataDesligamentoIso: string | null;
  dataDesligamentoLabel: string | null;
};

export type PortalColaboradoresResumo = {
  total: number;
  /** Equipe atual (não demitidos): ativo + processos em andamento. */
  totalAtivos: number;
  totalDemitidos: number;
  totalAdmissionalEmAndamento: number;
  totalDemissionalEmAndamento: number;
  temColaboradores: boolean;
  linhaResumo: string;
};

export type PortalColaboradorVagaFonte = {
  colaborador?: string | null;
  colaborador_cpf?: string | null;
  cargo_nome?: string | null;
};

export type PortalColaboradorAgendamentoFonte = {
  id?: string | null;
  colaborador?: string | null;
  colaborador_cpf?: string | null;
  cargo_nome?: string | null;
  aso?: string | null;
  status?: string | null;
  data_agendamento?: string | null;
  aso_retido_em?: string | null;
};

type Interno = {
  cpfDigits: string;
  nome: string;
  cargo: string;
  fromVaga: boolean;
  dataAdmissaoIso: string | null;
  dataDesligamentoIso: string | null;
  ultimoAdmissionalSortKey: string;
  ultimoAdmissionalRetidoSortKey: string;
  ultimoAdmissionalAgendadoSortKey: string;
  ultimoDemissionalRetidoIso: string | null;
  ultimoDemissionalRetidoSortKey: string;
  ultimoDemissionalAgendadoSortKey: string;
  ultimoEventoSortKey: string;
};

const SITUACAO_LABEL: Record<PortalColaboradorSituacao, string> = {
  ativo: "Ativo",
  admissional_em_andamento: "Admissional em andamento",
  demissional_em_andamento: "Demissional em andamento",
  demitido: "Demitido",
};

/** Exibição em caixa alta (pt-BR). Não altera o valor persistido. */
export function apresentarNomeColaboradorPortal(nome: string): string {
  return nome.toLocaleUpperCase("pt-BR");
}

export function apresentarCargoColaboradorPortal(cargo: string): string {
  return cargo.toLocaleUpperCase("pt-BR");
}

function normalizeAso(value: string | null | undefined): string {
  return String(value ?? "").trim().toLocaleLowerCase("pt-BR");
}

function isAdmissional(aso: string | null | undefined): boolean {
  return normalizeAso(aso) === "admissional";
}

function isDemissional(aso: string | null | undefined): boolean {
  return normalizeAso(aso) === "demissional";
}

function isAgendamentoPortalRelevante(
  status: string | null | undefined
): boolean {
  if (isAgendamentoCancelado(status)) return false;
  const key = String(status ?? "").trim().toLowerCase();
  return key === "agendado" || key === "aso_retido";
}

function isAsoRetido(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toLowerCase() === "aso_retido";
}

function isAgendado(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toLowerCase() === "agendado";
}

function toDataIso(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const iso = raw.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
}

function eventSortKey(
  dataAgendamento: string | null | undefined,
  asoRetidoEm: string | null | undefined
): string {
  const data = toDataIso(dataAgendamento) ?? "0000-00-00";
  const retido = String(asoRetidoEm ?? "").trim();
  return `${data}|${retido || "0000-00-00T00:00:00.000Z"}`;
}

function minIso(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function nomeLimpo(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cargoLimpo(value: string | null | undefined): string {
  return nomeLimpo(value);
}

export function mascararCpfPortal(
  cpf: string | null | undefined
): string {
  const digits = normalizeCpfDigits(cpf);
  if (digits.length !== 11) return "—";
  return `***.***.***-${digits.slice(9)}`;
}

export function isSituacaoEquipeAtual(
  situacao: PortalColaboradorSituacao
): boolean {
  return situacao !== "demitido";
}

export function calcPortalColaboradoresResumo(
  linhas: PortalColaboradorLinha[]
): PortalColaboradoresResumo {
  const total = linhas.length;
  const totalAtivos = linhas.filter((l) =>
    isSituacaoEquipeAtual(l.situacao)
  ).length;
  const totalDemitidos = linhas.filter((l) => l.situacao === "demitido").length;
  const totalAdmissionalEmAndamento = linhas.filter(
    (l) => l.situacao === "admissional_em_andamento"
  ).length;
  const totalDemissionalEmAndamento = linhas.filter(
    (l) => l.situacao === "demissional_em_andamento"
  ).length;
  return {
    total,
    totalAtivos,
    totalDemitidos,
    totalAdmissionalEmAndamento,
    totalDemissionalEmAndamento,
    temColaboradores: total > 0,
    linhaResumo:
      totalAtivos === 0
        ? "Nenhum colaborador ativo"
        : totalAtivos === 1
          ? "1 colaborador ativo"
          : `${totalAtivos} colaboradores ativos`,
  };
}

function ensureBucket(map: Map<string, Interno>, cpfDigits: string): Interno {
  let row = map.get(cpfDigits);
  if (!row) {
    row = {
      cpfDigits,
      nome: "",
      cargo: "",
      fromVaga: false,
      dataAdmissaoIso: null,
      dataDesligamentoIso: null,
      ultimoAdmissionalSortKey: "",
      ultimoAdmissionalRetidoSortKey: "",
      ultimoAdmissionalAgendadoSortKey: "",
      ultimoDemissionalRetidoIso: null,
      ultimoDemissionalRetidoSortKey: "",
      ultimoDemissionalAgendadoSortKey: "",
      ultimoEventoSortKey: "",
    };
    map.set(cpfDigits, row);
  }
  return row;
}

function aplicarIdentidade(
  row: Interno,
  nome: string,
  cargo: string,
  sortKey: string
) {
  if (nome && (!row.nome || sortKey >= row.ultimoEventoSortKey)) {
    row.nome = nome;
  }
  if (cargo && (!row.cargo || sortKey >= row.ultimoEventoSortKey)) {
    row.cargo = cargo;
  }
  if (sortKey >= row.ultimoEventoSortKey) {
    row.ultimoEventoSortKey = sortKey;
  }
}

function resolverSituacao(row: Interno): PortalColaboradorSituacao {
  const demRet = row.ultimoDemissionalRetidoSortKey;
  const admAny = row.ultimoAdmissionalSortKey;
  const admAge = row.ultimoAdmissionalAgendadoSortKey;
  const admRet = row.ultimoAdmissionalRetidoSortKey;
  const demAge = row.ultimoDemissionalAgendadoSortKey;

  // Demitido: Demissional aso_retido sem Admissional posterior
  if (demRet && (!admAny || admAny < demRet)) {
    return "demitido";
  }

  // Demissional em andamento
  if (
    demAge &&
    (!demRet || demAge > demRet) &&
    (!admAny || admAny < demAge)
  ) {
    return "demissional_em_andamento";
  }

  // Admissional em andamento:
  // - novo (sem vaga / sem admissional retido), ou
  // - readmissão após demissional concluído
  if (
    admAge &&
    (!admRet || admAge > admRet) &&
    (!demRet || admAge > demRet)
  ) {
    const readmissao = Boolean(demRet && admAge > demRet);
    const novoSemBase = !row.fromVaga && !admRet;
    if (readmissao || novoSemBase) {
      return "admissional_em_andamento";
    }
  }

  return "ativo";
}

/**
 * Consolida roster Portal a partir de vagas + agendamentos (cancelados ignorados).
 */
export function consolidarPortalColaboradores(input: {
  vagas: PortalColaboradorVagaFonte[];
  agendamentos: PortalColaboradorAgendamentoFonte[];
}): PortalColaboradorLinha[] {
  const map = new Map<string, Interno>();

  for (const vaga of input.vagas) {
    if (!vagaTemOcupanteIdentificado(vaga)) continue;
    const cpf = normalizeCpfDigits(vaga.colaborador_cpf);
    const row = ensureBucket(map, cpf);
    row.fromVaga = true;
    aplicarIdentidade(
      row,
      nomeLimpo(vaga.colaborador),
      cargoLimpo(vaga.cargo_nome),
      "0000-01-01|vaga"
    );
  }

  const ags = input.agendamentos
    .filter((ag) => isAgendamentoPortalRelevante(ag.status))
    .slice()
    .sort((a, b) =>
      eventSortKey(a.data_agendamento, a.aso_retido_em).localeCompare(
        eventSortKey(b.data_agendamento, b.aso_retido_em)
      )
    );

  for (const ag of ags) {
    const cpf = normalizeCpfDigits(ag.colaborador_cpf);
    if (!isValidCPF(cpf)) continue;

    const nome = nomeLimpo(ag.colaborador);
    const cargo = cargoLimpo(ag.cargo_nome);
    const dataIso = toDataIso(ag.data_agendamento);
    const sortKey = eventSortKey(ag.data_agendamento, ag.aso_retido_em);
    const admissional = isAdmissional(ag.aso);
    const demissional = isDemissional(ag.aso);
    const retido = isAsoRetido(ag.status);
    const agendado = isAgendado(ag.status);

    // Periódico / Retorno / Mudança: só atualiza se já conhecido
    if (!admissional && !demissional) {
      const existing = map.get(cpf);
      if (!existing) continue;
      aplicarIdentidade(existing, nome, cargo, sortKey);
      continue;
    }

    // Demissional só agendado de desconhecido: não cria registro
    if (demissional && !retido && !map.has(cpf)) {
      continue;
    }

    const row = ensureBucket(map, cpf);
    aplicarIdentidade(row, nome, cargo, sortKey);

    if (admissional) {
      if (dataIso) {
        row.dataAdmissaoIso = minIso(row.dataAdmissaoIso, dataIso);
      }
      if (sortKey >= row.ultimoAdmissionalSortKey) {
        row.ultimoAdmissionalSortKey = sortKey;
      }
      if (retido && sortKey >= row.ultimoAdmissionalRetidoSortKey) {
        row.ultimoAdmissionalRetidoSortKey = sortKey;
      }
      if (agendado && sortKey >= row.ultimoAdmissionalAgendadoSortKey) {
        row.ultimoAdmissionalAgendadoSortKey = sortKey;
      }
    }

    if (demissional) {
      if (retido && dataIso && sortKey >= row.ultimoDemissionalRetidoSortKey) {
        row.ultimoDemissionalRetidoIso = dataIso;
        row.ultimoDemissionalRetidoSortKey = sortKey;
        row.dataDesligamentoIso = dataIso;
      }
      if (agendado && sortKey >= row.ultimoDemissionalAgendadoSortKey) {
        row.ultimoDemissionalAgendadoSortKey = sortKey;
      }
    }
  }

  const linhas: PortalColaboradorLinha[] = [];
  for (const row of Array.from(map.values())) {
    if (!row.nome) continue;

    const situacao = resolverSituacao(row);
    const demitido = situacao === "demitido";

    linhas.push({
      id: row.cpfDigits,
      cpfDigits: row.cpfDigits,
      cpfMascarado: mascararCpfPortal(row.cpfDigits),
      nome: row.nome,
      cargo: row.cargo || "—",
      situacao,
      situacaoLabel: SITUACAO_LABEL[situacao],
      dataAdmissaoIso: row.dataAdmissaoIso,
      dataAdmissaoLabel: row.dataAdmissaoIso
        ? formatDateIsoToBR(row.dataAdmissaoIso)
        : null,
      dataDesligamentoIso: demitido ? row.dataDesligamentoIso : null,
      dataDesligamentoLabel:
        demitido && row.dataDesligamentoIso
          ? formatDateIsoToBR(row.dataDesligamentoIso)
          : null,
    });
  }

  linhas.sort((a, b) => compareByLabel(a.nome, b.nome));

  return linhas;
}

export function filtrarPortalColaboradores(
  linhas: PortalColaboradorLinha[],
  opts: {
    filtro: PortalColaboradoresFiltro;
    buscaNome?: string;
  }
): PortalColaboradorLinha[] {
  let base =
    opts.filtro === "ativos"
      ? linhas.filter((l) => isSituacaoEquipeAtual(l.situacao))
      : opts.filtro === "demitidos"
        ? linhas.filter((l) => l.situacao === "demitido")
        : linhas;

  const q = (opts.buscaNome ?? "").trim().toLocaleLowerCase("pt-BR");
  if (q) {
    base = base.filter((l) =>
      l.nome.toLocaleLowerCase("pt-BR").includes(q)
    );
  }
  return base.slice().sort((a, b) => compareByLabel(a.nome, b.nome));
}

export function linhasResumoColaboradoresHome(
  resumo: PortalColaboradoresResumo | null
): string[] {
  if (!resumo) {
    return ["Equipe vinculada ao contrato e aos exames ocupacionais."];
  }
  return [resumo.linhaResumo];
}
