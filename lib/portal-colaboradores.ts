/**
 * Portal do Cliente e modal de Clientes — relação de colaboradores.
 * Derivado das vagas de todos os contratos da empresa, dos agendamentos
 * e de colaborador_movimentacoes. Sem tabela mestre de pessoas.
 *
 * Identidade dentro do mesmo cliente:
 * - CPF válido normalizado une programação e agendamentos
 * - registro antigo sem CPF permanece separado; nome igual não une pessoas
 *
 * Situação:
 * - Desligado: Demissional agendado ou já retido, ou desligamento manual,
 *   posterior à última entrada
 * - Cancelar o Demissional recalcula a situação. Volta a Ativo se não
 *   restar outro Demissional não cancelado nem desligamento manual válido
 * Cancelados não entram na situação. Empate de chave: readmissão prevalece.
 */

import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { isNomeFuncionarioReal } from "@/lib/contrato-vagas";
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
  /**
   * Registro vigente de admissão deste vínculo (empresa + CPF).
   * Nulo quando a data exibida ainda é só a do exame admissional.
   */
  admissaoMovimentacaoId: string | null;
  /**
   * Agendamento usado no histórico quando o registro não tem CPF.
   * Com CPF, o histórico usa o documento e ignora este campo.
   */
  historicoAgendamentoId: string | null;
  /** Vaga usada no desligamento quando o registro não tem CPF. */
  vinculoVagaId: string | null;
};

export const COLABORADOR_CAMPOS_ADMIN_PRIVADOS = [
  "desligamentoOrigem",
  "desligamentoMovimentacaoId",
  "admissaoMovimentacaoId",
  "historicoAgendamentoId",
  "vinculoVagaId",
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
  id?: string | null;
  agendamento_id?: string | null;
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
  vinculo_agendamento_id?: string | null;
  vinculo_vaga_id?: string | null;
};

const TIPO_DESLIGAMENTO_ADMIN = "desligamento_admin";
const TIPO_ADMISSAO = "admissao";

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
  /** Data gravada no evento de admissão. Não entra na situação. */
  admissaoOficialSortKey: string;
  admissaoOficialIso: string | null;
  admissaoMovimentacaoId: string | null;
  historicoAgendamentoId: string | null;
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

function cpfValido(value: string | null | undefined): string | null {
  const digits = normalizeCpfDigits(value);
  return isValidCPF(digits) ? digits : null;
}

function ensureBucket(
  map: Map<string, Interno>,
  chave: string,
  cpfDigits: string
): Interno {
  let row = map.get(chave);
  if (!row) {
    row = {
      cpfDigits: cpfValido(cpfDigits) ?? "",
      nome: "",
      cargo: "",
      ultimoAdmissionalSortKey: "",
      ultimoAdmissionalIso: null,
      ultimoSaidaSortKey: "",
      ultimoSaidaIso: null,
      ultimoSaidaOrigem: null,
      ultimoSaidaMovimentacaoId: null,
      ultimoEventoSortKey: "",
      admissaoOficialSortKey: "",
      admissaoOficialIso: null,
      admissaoMovimentacaoId: null,
      historicoAgendamentoId: null,
    };
    map.set(chave, row);
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

function isAdmissaoOficialValida(
  mov: PortalColaboradorMovimentacaoFonte
): boolean {
  if (String(mov.tipo ?? "").trim() !== TIPO_ADMISSAO) return false;
  return !String(mov.cancelado_em ?? "").trim();
}

function bucketDaMovimentacao(
  map: Map<string, Interno>,
  mov: PortalColaboradorMovimentacaoFonte
): Interno | null {
  const cpf = cpfValido(mov.cpf_digits);
  if (cpf) return map.get(cpf) ?? null;
  const agendamentoId = String(mov.vinculo_agendamento_id ?? "").trim();
  if (agendamentoId) return map.get(`semcpf:ag:${agendamentoId}`) ?? null;
  const vagaId = String(mov.vinculo_vaga_id ?? "").trim();
  if (vagaId) return map.get(`semcpf:vaga:${vagaId}`) ?? null;
  return null;
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
  const cpfPorAgendamento = new Map<string, string>();
  const cpfPorVagaDoAgendamento = new Map<string, string>();

  for (const ag of input.agendamentos) {
    if (!isAgendamentoPortalRelevante(ag.status)) continue;
    const id = String(ag.id ?? "").trim();
    const cpf = cpfValido(ag.colaborador_cpf);
    if (id && cpf) cpfPorAgendamento.set(id, cpf);
  }
  for (const vaga of input.vagas) {
    const agendamentoId = String(vaga.agendamento_id ?? "").trim();
    const cpf = cpfValido(vaga.colaborador_cpf);
    if (agendamentoId && cpf) cpfPorVagaDoAgendamento.set(agendamentoId, cpf);
  }

  const chaveDe = (opts: {
    cpf: string | null;
    agendamentoId: string;
    vagaId: string;
  }): { chave: string; cpf: string } | null => {
    if (opts.cpf) return { chave: opts.cpf, cpf: opts.cpf };
    if (opts.agendamentoId) {
      const peloExame = cpfPorAgendamento.get(opts.agendamentoId);
      if (peloExame) return { chave: peloExame, cpf: peloExame };
      const pelaVaga = cpfPorVagaDoAgendamento.get(opts.agendamentoId);
      if (pelaVaga) return { chave: pelaVaga, cpf: pelaVaga };
      return { chave: `semcpf:ag:${opts.agendamentoId}`, cpf: "" };
    }
    if (opts.vagaId) return { chave: `semcpf:vaga:${opts.vagaId}`, cpf: "" };
    return null;
  };

  for (const vaga of input.vagas) {
    const nome = nomeLimpo(vaga.colaborador);
    if (!isNomeFuncionarioReal(nome)) continue;
    const identidade = chaveDe({
      cpf: cpfValido(vaga.colaborador_cpf),
      agendamentoId: String(vaga.agendamento_id ?? "").trim(),
      vagaId: String(vaga.id ?? "").trim(),
    });
    if (!identidade) continue;
    const row = ensureBucket(map, identidade.chave, identidade.cpf);
    if (identidade.chave.startsWith("semcpf:ag:") && !row.historicoAgendamentoId) {
      row.historicoAgendamentoId = identidade.chave.slice("semcpf:ag:".length);
    }
    aplicarIdentidade(row, nome, cargoLimpo(vaga.cargo_nome), "0000-01-01|vaga");
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
    const nome = nomeLimpo(ag.colaborador);
    if (!isNomeFuncionarioReal(nome)) continue;
    const agendamentoId = String(ag.id ?? "").trim();
    const identidade = chaveDe({
      cpf: cpfValido(ag.colaborador_cpf),
      agendamentoId,
      vagaId: "",
    });
    if (!identidade) continue;

    const cargo = cargoLimpo(ag.cargo_nome);
    const dataIso = toDataIso(ag.data_agendamento);
    const sortKey = eventSortKey(ag.data_agendamento, ag.aso_retido_em);
    const row = ensureBucket(map, identidade.chave, identidade.cpf);
    if (identidade.chave.startsWith("semcpf:ag:") && !row.historicoAgendamentoId) {
      row.historicoAgendamentoId = agendamentoId;
    }
    aplicarIdentidade(row, nome, cargo, sortKey);

    if (
      isAdmissional(ag.aso) &&
      dataIso &&
      sortKey >= row.ultimoAdmissionalSortKey
    ) {
      row.ultimoAdmissionalSortKey = sortKey;
      row.ultimoAdmissionalIso = dataIso;
    }

    // Agendado e ASO retido desligam. Cancelado já ficou de fora da fonte.
    if (isDemissional(ag.aso) && dataIso) {
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
    const existing = bucketDaMovimentacao(map, mov);
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

  const admissoes = (input.movimentacoes ?? [])
    .filter(isAdmissaoOficialValida)
    .slice()
    .sort((a, b) =>
      eventSortKey(a.data_evento, a.criado_em).localeCompare(
        eventSortKey(b.data_evento, b.criado_em)
      )
    );

  for (const mov of admissoes) {
    const existing = bucketDaMovimentacao(map, mov);
    if (!existing) continue;
    const dataIso = toDataIso(mov.data_evento);
    if (!dataIso) continue;
    const sortKey = eventSortKey(mov.data_evento, mov.criado_em);
    if (sortKey < existing.admissaoOficialSortKey) continue;
    existing.admissaoOficialSortKey = sortKey;
    existing.admissaoOficialIso = dataIso;
    existing.admissaoMovimentacaoId = String(mov.id ?? "").trim() || null;
  }

  const linhas: ClienteColaboradorLinha[] = [];
  for (const [chave, row] of Array.from(map.entries())) {
    if (!row.nome) continue;

    const situacao = resolverSituacao(row);
    const demitido = situacao === "demitido";
    const desligamentoIso = demitido ? row.ultimoSaidaIso : null;
    const dataAdmissaoIso = row.admissaoOficialIso ?? row.ultimoAdmissionalIso;
    const cpfDigits = cpfValido(row.cpfDigits) ?? "";

    linhas.push({
      id: cpfDigits || chave,
      cpfDigits,
      cpfMascarado: mascararCpfPortal(cpfDigits),
      nome: row.nome,
      cargo: row.cargo || "—",
      situacao,
      situacaoLabel: SITUACAO_LABEL[situacao],
      dataAdmissaoIso,
      dataAdmissaoLabel: dataAdmissaoIso
        ? formatDateIsoToBR(dataAdmissaoIso)
        : null,
      dataDesligamentoIso: desligamentoIso,
      dataDesligamentoLabel: desligamentoIso
        ? formatDateIsoToBR(desligamentoIso)
        : null,
      desligamentoOrigem: demitido ? row.ultimoSaidaOrigem : null,
      desligamentoMovimentacaoId: demitido
        ? row.ultimoSaidaMovimentacaoId
        : null,
      admissaoMovimentacaoId: row.admissaoOficialIso
        ? row.admissaoMovimentacaoId
        : null,
      historicoAgendamentoId: cpfDigits ? null : row.historicoAgendamentoId,
      vinculoVagaId:
        cpfDigits || !chave.startsWith("semcpf:vaga:")
          ? null
          : chave.slice("semcpf:vaga:".length),
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

export type HistoricoExameColaborador = {
  id: string;
  dataIso: string | null;
  dataLabel: string;
  tipoExame: string;
  situacao: string;
};

const SITUACAO_EXAME: Record<string, string> = {
  agendado: "Agendado",
  aso_retido: "ASO retido",
  cancelado: "Cancelado",
  rascunho: "Rascunho",
};

export function labelSituacaoExameColaborador(
  status: string | null | undefined
): string {
  const key = String(status ?? "").trim().toLowerCase();
  if (!key) return "—";
  return SITUACAO_EXAME[key] ?? "—";
}

export function labelTipoExameColaborador(
  aso: string | null | undefined
): string {
  const raw = String(aso ?? "").replace(/\s+/g, " ").trim();
  return raw || "—";
}

/**
 * Exames da pessoa na empresa. Com CPF, une os exames de qualquer contrato.
 * Sem CPF, devolve só o agendamento indicado. Nome igual não entra.
 */
export function montarHistoricoExamesColaborador(input: {
  agendamentos: PortalColaboradorAgendamentoFonte[];
  cpf?: string | null;
  agendamentoId?: string | null;
}): HistoricoExameColaborador[] {
  const cpf = cpfValido(input.cpf);
  const agendamentoId = String(input.agendamentoId ?? "").trim();
  if (!cpf && !agendamentoId) return [];

  const exames = input.agendamentos.filter((ag) => {
    if (!isAgendamentoPortalRelevante(ag.status)) return false;
    if (cpf) return cpfValido(ag.colaborador_cpf) === cpf;
    return String(ag.id ?? "").trim() === agendamentoId;
  });

  exames.sort((a, b) => {
    const porData = eventSortKey(b.data_agendamento, b.aso_retido_em).localeCompare(
      eventSortKey(a.data_agendamento, a.aso_retido_em)
    );
    if (porData !== 0) return porData;
    return String(b.id ?? "").localeCompare(String(a.id ?? ""));
  });

  return exames.map((ag) => {
    const dataIso = toDataIso(ag.data_agendamento);
    return {
      id: String(ag.id ?? "").trim() || dataIso || labelTipoExameColaborador(ag.aso),
      dataIso,
      dataLabel: dataIso ? formatDateIsoToBR(dataIso) : "—",
      tipoExame: labelTipoExameColaborador(ag.aso),
      situacao: labelSituacaoExameColaborador(ag.status),
    };
  });
}

export function linhasResumoColaboradoresHome(
  resumo: PortalColaboradoresResumo | null
): string[] {
  if (!resumo) {
    return ["Equipe vinculada ao contrato e aos exames ocupacionais."];
  }
  return [resumo.linhaResumo];
}
