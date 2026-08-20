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

/**
 * Só vaga comprometida, sem agendamento nem periódico futuro.
 * Não apaga a linha: o ocupante é limpo e o status volta para aberta.
 */
export function vagaPermiteRemoverFuncionario(vaga: {
  status?: ContratoVagaStatus | null;
  agendamento_id?: string | null;
  periodico_futuro_id?: string | null;
}): boolean {
  if (vaga.status !== "comprometida") return false;
  if (vagaStatusBloqueiaEdicao(vaga.status)) return false;
  if (vaga.agendamento_id || vaga.periodico_futuro_id) return false;
  return true;
}

export function draftAposRemoverFuncionario(
  draft: Pick<ContratoVagaDraft, "id" | "indice">
): ContratoVagaDraft {
  return {
    ...emptyVagaDraft(draft.indice),
    id: draft.id,
  };
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

export function cpfVagaIguais(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const da = normalizeCpfDigits(a);
  const db = normalizeCpfDigits(b);
  return isValidCPF(da) && da === db;
}

export function vagaStatusEClassificacaoFinal(
  status: ContratoVagaStatus
): boolean {
  return status === "agendada" || status === "programada" || status === "aso_aberto";
}

/**
 * Etapa Agendamentos da Implantação: todas as vagas classificadas
 * (agendada / programada / ASO em aberto). Comprometida ainda não conclui.
 * Não usa percentual de progresso operacional.
 */
export function isClassificacaoVagasContratoCompleta(input: {
  previstos: number;
  pendentesDefinicao: number;
  vagasComprometidas: number;
}): boolean {
  if (input.previstos <= 0) return false;
  return input.pendentesDefinicao === 0 && input.vagasComprometidas === 0;
}

export type CardsVagasContrato = {
  agendados: number;
  programadosFuturos: number;
  emAberto: number;
  vagasComprometidas: number;
  pendentesDefinicao: number;
};

/**
 * Há classificação real nas vagas (não só linhas em aberto criadas pela migration).
 * Nesse caso os cards devem seguir contrato_vagas, não contrato_agendamentos.
 */
export function deveUsarVagasComoFonteDosCards(
  vagas: Array<Pick<ContratoVagaRecord, "status">>
): boolean {
  return vagas.some((vaga) => vaga.status !== "aberta");
}

/**
 * Cada vaga prevista entra em uma única categoria.
 * pendentes = previstos - agendados - programados - ASOs - comprometidos.
 */
export function contarCardsPorVagasContrato(
  vagas: Array<Pick<ContratoVagaRecord, "status">>,
  quantidadePrevista: number
): CardsVagasContrato {
  let agendados = 0;
  let programadosFuturos = 0;
  let emAberto = 0;
  let vagasComprometidas = 0;
  for (const vaga of vagas) {
    if (vaga.status === "agendada") agendados += 1;
    else if (vaga.status === "programada") programadosFuturos += 1;
    else if (vaga.status === "aso_aberto") emAberto += 1;
    else if (vaga.status === "comprometida") vagasComprometidas += 1;
  }
  const previstos = Math.max(0, Math.floor(Number(quantidadePrevista) || 0));
  const pendentesDefinicao = Math.max(
    0,
    previstos - agendados - programadosFuturos - emAberto - vagasComprometidas
  );
  return {
    agendados,
    programadosFuturos,
    emAberto,
    vagasComprometidas,
    pendentesDefinicao,
  };
}

export type AgendamentoExibicaoVaga = {
  id: string;
  status: string;
  data_agendamento?: string | null;
  aso?: string | null;
  colaborador_cpf?: string | null;
};

export type PeriodicoExibicaoVaga = {
  id: string;
  proxima_data?: string | null;
  tipo_aso?: string | null;
};

export type DadosExibicaoVagaContrato = {
  dataExameIso: string | null;
  tipoAso: string | null;
  agendamentoIdVisualizar: string | null;
};

const DADOS_EXIBICAO_VAGA_VAZIO: DadosExibicaoVagaContrato = {
  dataExameIso: null,
  tipoAso: null,
  agendamentoIdVisualizar: null,
};

function isoDateOrNull(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function tipoAsoOrNull(value: string | null | undefined): string | null {
  const tipo = (value ?? "").trim();
  return tipo || null;
}

/**
 * Data, tipo de ASO e Visualizar da tabela "Vagas do contrato".
 * Fonte: vínculo explícito da vaga. Cancelado nunca preenche a linha.
 */
export function resolverDadosExibicaoVagaContrato(params: {
  vaga: Pick<
    ContratoVagaRecord,
    | "id"
    | "status"
    | "agendamento_id"
    | "periodico_futuro_id"
    | "colaborador_cpf"
  >;
  demaisVagas?: Array<Pick<ContratoVagaRecord, "id" | "agendamento_id">>;
  agendamentos: AgendamentoExibicaoVaga[];
  periodicos?: PeriodicoExibicaoVaga[];
}): DadosExibicaoVagaContrato {
  const { vaga } = params;

  if (
    vaga.status === "aberta" ||
    vaga.status === "aso_aberto" ||
    vaga.status === "comprometida"
  ) {
    return DADOS_EXIBICAO_VAGA_VAZIO;
  }

  if (vaga.status === "programada") {
    const pid = (vaga.periodico_futuro_id ?? "").trim();
    const periodico = pid
      ? (params.periodicos ?? []).find((item) => item.id === pid)
      : undefined;
    return {
      dataExameIso: isoDateOrNull(periodico?.proxima_data),
      tipoAso: tipoAsoOrNull(periodico?.tipo_aso),
      agendamentoIdVisualizar: null,
    };
  }

  if (vaga.status !== "agendada") {
    return DADOS_EXIBICAO_VAGA_VAZIO;
  }

  const byId = new Map(params.agendamentos.map((ag) => [ag.id, ag]));
  const vinculado = vaga.agendamento_id
    ? byId.get(vaga.agendamento_id)
    : undefined;

  let escolhido: AgendamentoExibicaoVaga | undefined;
  if (vinculado && vinculado.status !== "cancelado") {
    escolhido = vinculado;
  } else {
    const ocupados = new Set(
      (params.demaisVagas ?? [])
        .filter((outra) => outra.id !== vaga.id && outra.agendamento_id)
        .map((outra) => outra.agendamento_id as string)
    );
    const cpf = normalizeCpfDigits(vaga.colaborador_cpf);
    const candidatos = params.agendamentos.filter((ag) => {
      if (ocupados.has(ag.id)) return false;
      if (ag.status === "cancelado") return false;
      if (!isValidCPF(cpf)) return false;
      return cpfVagaIguais(ag.colaborador_cpf, cpf);
    });
    if (candidatos.length === 1) escolhido = candidatos[0];
  }

  if (!escolhido) return DADOS_EXIBICAO_VAGA_VAZIO;

  return {
    dataExameIso: isoDateOrNull(escolhido.data_agendamento),
    tipoAso: tipoAsoOrNull(escolhido.aso),
    agendamentoIdVisualizar: escolhido.id,
  };
}

export function agendamentoOcupaVagaPrevista(
  agendamento: { id: string; colaborador_cpf?: string | null },
  vagas: Array<
    Pick<ContratoVagaRecord, "status" | "agendamento_id" | "colaborador_cpf">
  >
): boolean {
  if (vagas.some((vaga) => vaga.agendamento_id === agendamento.id)) {
    return true;
  }
  const cpf = normalizeCpfDigits(agendamento.colaborador_cpf);
  if (!isValidCPF(cpf)) return false;
  return vagas.some((vaga) => {
    if (
      vaga.status !== "agendada" &&
      vaga.status !== "programada" &&
      vaga.status !== "comprometida"
    ) {
      return false;
    }
    return cpfVagaIguais(vaga.colaborador_cpf, cpf);
  });
}

export type AgendamentoCandidatoVaga = {
  id: string;
  status: string;
  colaborador_cpf?: string | null;
  contrato_id?: string | null;
  cliente_id?: string | null;
  data_agendamento?: string | null;
};

/**
 * Escolhe um agendamento válido para ocupar vaga comprometida.
 * Cancelados nunca entram. Em empate inseguro, não escolhe.
 */
export function escolherAgendamentoValidoParaVaga(params: {
  vaga: Pick<ContratoVagaRecord, "contrato_id" | "colaborador_cpf" | "status">;
  agendamentos: AgendamentoCandidatoVaga[];
  contratoClienteId?: string | null;
  vigenciaInicio?: string | null;
  vigenciaFim?: string | null;
  idsJaVinculadosEmOutraVaga?: Iterable<string>;
}): string | null {
  if (params.vaga.status !== "comprometida") return null;
  const cpf = normalizeCpfDigits(params.vaga.colaborador_cpf);
  if (!isValidCPF(cpf)) return null;

  const ocupados = new Set(
    Array.from(params.idsJaVinculadosEmOutraVaga ?? []).filter(Boolean)
  );
  const inicio = (params.vigenciaInicio ?? "").slice(0, 10);
  const fim = (params.vigenciaFim ?? "").slice(0, 10);
  const clienteId = (params.contratoClienteId ?? "").trim();

  const candidatos = params.agendamentos.filter((ag) => {
    if (ocupados.has(ag.id)) return false;
    if (ag.status === "cancelado") return false;
    if (!cpfVagaIguais(ag.colaborador_cpf, cpf)) return false;
    const contratoAg = (ag.contrato_id ?? "").trim();
    if (contratoAg && contratoAg !== params.vaga.contrato_id) return false;
    if (contratoAg === params.vaga.contrato_id) return true;
    if (!clienteId) return false;
    if ((ag.cliente_id ?? "").trim() !== clienteId) return false;
    const dia = (ag.data_agendamento ?? "").slice(0, 10);
    if (inicio && fim && dia) {
      return dia >= inicio && dia <= fim;
    }
    return true;
  });

  if (candidatos.length === 0) return null;

  const doContrato = candidatos.filter(
    (ag) => (ag.contrato_id ?? "").trim() === params.vaga.contrato_id
  );
  const pool = doContrato.length > 0 ? doContrato : candidatos;
  if (pool.length !== 1) return null;
  return pool[0].id;
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
