/**
 * Portal do Cliente — módulo Colaboradores.
 * Derivado de contrato_vagas + agendamentos + colaborador_movimentacoes.
 * Sem tabela mestre de pessoas. Identidade: cliente + CPF normalizado.
 *
 * Situações (fatos persistidos, ordem cronológica):
 * - Ativo: vaga e/ou última entrada (Admissional) posterior à última saída
 * - Demitido: última saída (Demissional ou desligamento_admin) posterior à entrada
 * Cancelados (agendamento ou movimentação) não entram na fonte.
 * Empate de chave: não considera Demitido (readmissão prevalece).
 */

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { vagaTemOcupanteIdentificado } from "@/lib/contrato-vagas";
import { isValidCPF, normalizeCpfDigits } from "@/lib/cpf";
import { isAgendamentoCancelado } from "@/lib/contrato-agendamentos";
import { compareByLabel } from "@/lib/sort-by-label";

export type PortalColaboradorSituacao = "ativo" | "demitido";

export type PortalColaboradoresFiltro = "todos" | "ativos" | "demitidos";

export type PortalColaboradorDesligamentoOrigem = "demissional" | "admin";

/** DTO visível no Portal do Cliente. Sem metadados administrativos. */
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

/** DTO interno/admin. Inclui origem da saída vigente para Desfazer. */
export type ClienteColaboradorLinha = PortalColaboradorLinha & {
  desligamentoOrigem: PortalColaboradorDesligamentoOrigem | null;
  desligamentoMovimentacaoId: string | null;
};

export const COLABORADOR_CAMPOS_ADMIN_PRIVADOS = [
  "desligamentoOrigem",
  "desligamentoMovimentacaoId",
] as const;

/** Remove metadados administrativos. Não altera a regra consolidada. */
export function paraLinhaPortalCliente(
  linha: ClienteColaboradorLinha
): PortalColaboradorLinha {
  return {
    id: linha.id,
    cpfDigits: linha.cpfDigits,
    cpfMascarado: linha.cpfMascarado,
    nome: linha.nome,
    cargo: linha.cargo,
    situacao: linha.situacao,
    situacaoLabel: linha.situacaoLabel,
    dataAdmissaoIso: linha.dataAdmissaoIso,
    dataAdmissaoLabel: linha.dataAdmissaoLabel,
    dataDesligamentoIso: linha.dataDesligamentoIso,
    dataDesligamentoLabel: linha.dataDesligamentoLabel,
  };
}

export function paraColaboradoresPortalCliente(
  linhas: ClienteColaboradorLinha[]
): PortalColaboradorLinha[] {
  return linhas.map(paraLinhaPortalCliente);
}

export type PortalColaboradoresResumo = {
  total: number;
  /** Equipe atual: não demitidos. */
  totalAtivos: number;
  totalDemitidos: number;
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

export type PortalColaboradorMovimentacaoFonte = {
  id?: string | null;
  cpf_digits?: string | null;
  tipo?: string | null;
  data_evento?: string | null;
  cancelado_em?: string | null;
  colaborador_nome?: string | null;
  cargo_nome?: string | null;
  criado_em?: string | null;
};

const TIPO_DESLIGAMENTO_ADMIN = "desligamento_admin";

type Interno = {
  cpfDigits: string;
  nome: string;
  cargo: string;
  ultimoAdmissionalSortKey: string;
  ultimoAdmissionalIso: string | null;
  ultimoSaidaSortKey: string;
  ultimoSaidaIso: string | null;
  ultimoSaidaOrigem: PortalColaboradorDesligamentoOrigem | null;
  ultimoSaidaMovimentacaoId: string | null;
  ultimoEventoSortKey: string;
};

const SITUACAO_LABEL: Record<PortalColaboradorSituacao, string> = {
  ativo: "Ativo",
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
  return situacao === "ativo";
}

export function calcPortalColaboradoresResumo(
  linhas: PortalColaboradorLinha[]
): PortalColaboradoresResumo {
  const total = linhas.length;
  const totalAtivos = linhas.filter((l) =>
    isSituacaoEquipeAtual(l.situacao)
  ).length;
  const totalDemitidos = linhas.filter((l) => l.situacao === "demitido").length;
  return {
    total,
    totalAtivos,
    totalDemitidos,
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
      ultimoAdmissionalSortKey: "",
      ultimoAdmissionalIso: null,
      ultimoSaidaSortKey: "",
      ultimoSaidaIso: null,
      ultimoSaidaOrigem: null,
      ultimoSaidaMovimentacaoId: null,
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
  const saida = row.ultimoSaidaSortKey;
  const admAny = row.ultimoAdmissionalSortKey;

  // Demitido: saída vigente posterior à última entrada.
  // Empate de chave: não considera Demitido (readmissão prevalece).
  if (saida && (!admAny || admAny < saida)) {
    return "demitido";
  }

  return "ativo";
}

function aplicarSaida(
  row: Interno,
  sortKey: string,
  dataIso: string,
  origem: PortalColaboradorDesligamentoOrigem,
  movimentacaoId: string | null
) {
  if (sortKey < row.ultimoSaidaSortKey) return;
  row.ultimoSaidaSortKey = sortKey;
  row.ultimoSaidaIso = dataIso;
  row.ultimoSaidaOrigem = origem;
  row.ultimoSaidaMovimentacaoId = movimentacaoId;
}

function isDesligamentoAdminValido(
  mov: PortalColaboradorMovimentacaoFonte
): boolean {
  if (String(mov.tipo ?? "").trim() !== TIPO_DESLIGAMENTO_ADMIN) return false;
  return !String(mov.cancelado_em ?? "").trim();
}

/**
 * Consolida roster a partir de vagas + agendamentos + movimentações.
 * Cancelados (agendamento ou movimentação) são ignorados.
 */
export function consolidarPortalColaboradores(input: {
  vagas: PortalColaboradorVagaFonte[];
  agendamentos: PortalColaboradorAgendamentoFonte[];
  movimentacoes?: PortalColaboradorMovimentacaoFonte[];
}): ClienteColaboradorLinha[] {
  const map = new Map<string, Interno>();

  for (const vaga of input.vagas) {
    if (!vagaTemOcupanteIdentificado(vaga)) continue;
    const cpf = normalizeCpfDigits(vaga.colaborador_cpf);
    const row = ensureBucket(map, cpf);
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

    // Periódico / Retorno / Mudança: só atualiza se já conhecido
    if (!admissional && !demissional) {
      const existing = map.get(cpf);
      if (!existing) continue;
      aplicarIdentidade(existing, nome, cargo, sortKey);
      continue;
    }

    const row = ensureBucket(map, cpf);
    aplicarIdentidade(row, nome, cargo, sortKey);

    if (admissional && dataIso && sortKey >= row.ultimoAdmissionalSortKey) {
      row.ultimoAdmissionalSortKey = sortKey;
      row.ultimoAdmissionalIso = dataIso;
    }

    if (demissional && dataIso) {
      aplicarSaida(row, sortKey, dataIso, "demissional", null);
    }
  }

  const movs = (input.movimentacoes ?? [])
    .filter(isDesligamentoAdminValido)
    .slice()
    .sort((a, b) =>
      eventSortKey(a.data_evento, a.criado_em).localeCompare(
        eventSortKey(b.data_evento, b.criado_em)
      )
    );

  for (const mov of movs) {
    const cpf = normalizeCpfDigits(mov.cpf_digits);
    if (!isValidCPF(cpf)) continue;
    const existing = map.get(cpf);
    if (!existing) continue;

    const dataIso = toDataIso(mov.data_evento);
    if (!dataIso) continue;
    const sortKey = eventSortKey(mov.data_evento, mov.criado_em);
    aplicarIdentidade(
      existing,
      nomeLimpo(mov.colaborador_nome),
      cargoLimpo(mov.cargo_nome),
      sortKey
    );
    aplicarSaida(
      existing,
      sortKey,
      dataIso,
      "admin",
      String(mov.id ?? "").trim() || null
    );
  }

  const linhas: ClienteColaboradorLinha[] = [];
  for (const row of Array.from(map.values())) {
    if (!row.nome) continue;

    const situacao = resolverSituacao(row);
    const demitido = situacao === "demitido";
    const desligamentoIso = demitido ? row.ultimoSaidaIso : null;

    linhas.push({
      id: row.cpfDigits,
      cpfDigits: row.cpfDigits,
      cpfMascarado: mascararCpfPortal(row.cpfDigits),
      nome: row.nome,
      cargo: row.cargo || "—",
      situacao,
      situacaoLabel: SITUACAO_LABEL[situacao],
      dataAdmissaoIso: row.ultimoAdmissionalIso,
      dataAdmissaoLabel: row.ultimoAdmissionalIso
        ? formatDateIsoToBR(row.ultimoAdmissionalIso)
        : null,
      dataDesligamentoIso: desligamentoIso,
      dataDesligamentoLabel: desligamentoIso
        ? formatDateIsoToBR(desligamentoIso)
        : null,
      desligamentoOrigem: demitido ? row.ultimoSaidaOrigem : null,
      desligamentoMovimentacaoId: demitido
        ? row.ultimoSaidaMovimentacaoId
        : null,
    });
  }

  linhas.sort((a, b) => compareByLabel(a.nome, b.nome));

  return linhas;
}

export function filtrarPortalColaboradores<T extends PortalColaboradorLinha>(
  linhas: T[],
  opts: {
    filtro: PortalColaboradoresFiltro;
    buscaNome?: string;
  }
): T[] {
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
