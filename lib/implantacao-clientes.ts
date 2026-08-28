import { isClassificacaoVagasContratoCompleta } from "@/lib/contrato-vagas";
import {
  isContratoEtapaConcluida,
  isFinanceiroEtapaConcluida,
  isFuncionariosEtapaConcluida,
  isLogoEtapaConcluida,
  isProcuracaoEtapaConcluida,
  isVisitaEtapaConcluida,
  type OrcamentoEtapaId,
} from "@/lib/orcamento-etapas";
import {
  isTreinamentoCancelado,
  isTreinamentoEtapaConcluida,
  type ImplantacaoTreinamentoRecord,
} from "@/lib/implantacao-treinamento";
import type { OrcamentoFluxoImplantacao } from "@/lib/servico-treinamentos";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import type { OrcamentoRecord, OrcamentoStatus } from "@/lib/orcamento-types";
import type { ClienteContratoRecord } from "@/lib/types";
import {
  contratoLiberaAgendamento,
  labelAgendamentoLiberacao,
} from "@/lib/cliente-pode-agendar";
import {
  processoBelongsToMesAprovacao,
  type ImplantacaoYearMonth,
} from "@/lib/implantacao-meses";

/** Etapas operacionais da implantação (pós-aprovação). */
export type ImplantacaoEtapaOperacionalId =
  | "contrato"
  | "financeiro"
  | "procuracao"
  | "funcionarios"
  | "logo"
  | "visita"
  | "agendamentos"
  | "treinamento";

export type ImplantacaoEtapaId =
  | Exclude<ImplantacaoEtapaOperacionalId, "agendamentos" | "treinamento">
  | "aguardando_agendamentos"
  | "agendamento_treinamento"
  | "treinamento_agendado"
  | "treinamento_cancelado"
  | "concluido"
  | "contrato_encerrado";

export const IMPLANTACAO_ETAPAS_OPERACIONAIS: Array<{
  id: ImplantacaoEtapaOperacionalId;
  label: string;
}> = [
  { id: "contrato", label: "Contrato" },
  { id: "financeiro", label: "Aguardando pagamento" },
  { id: "procuracao", label: "Aguardando procuração" },
  { id: "funcionarios", label: "Lista de funcionários" },
  { id: "logo", label: "Logo da empresa" },
  { id: "visita", label: "Visita técnica" },
  { id: "agendamentos", label: "Agendamentos" },
];

export const IMPLANTACAO_ETAPAS_OPERACIONAIS_TREINAMENTOS: Array<{
  id: ImplantacaoEtapaOperacionalId;
  label: string;
}> = [
  { id: "contrato", label: "Contrato" },
  { id: "financeiro", label: "Aguardando pagamento" },
  { id: "treinamento", label: "Agendamento do treinamento" },
];

export function buildImplantacaoEtapasOperacionais(
  fluxo: OrcamentoFluxoImplantacao = "padrao"
): Array<{ id: ImplantacaoEtapaOperacionalId; label: string }> {
  if (fluxo === "somente_treinamentos") {
    return [...IMPLANTACAO_ETAPAS_OPERACIONAIS_TREINAMENTOS];
  }
  if (fluxo === "combinado") {
    const etapas = [...IMPLANTACAO_ETAPAS_OPERACIONAIS];
    const finIdx = etapas.findIndex((e) => e.id === "financeiro");
    etapas.splice(finIdx + 1, 0, {
      id: "treinamento",
      label: "Agendamento do treinamento",
    });
    return etapas;
  }
  return [...IMPLANTACAO_ETAPAS_OPERACIONAIS];
}

export const IMPLANTACAO_ETAPA_OPTIONS: Array<{
  value: ImplantacaoEtapaId;
  label: string;
}> = [
  { value: "contrato", label: "Contrato" },
  { value: "financeiro", label: "Aguardando pagamento" },
  { value: "procuracao", label: "Aguardando procuração" },
  { value: "funcionarios", label: "Lista de funcionários" },
  { value: "logo", label: "Logo da empresa" },
  { value: "visita", label: "Visita agendada" },
  { value: "aguardando_agendamentos", label: "Aguardando agendamentos" },
  { value: "agendamento_treinamento", label: "Agendamento do treinamento" },
  { value: "treinamento_agendado", label: "Treinamento agendado" },
  { value: "treinamento_cancelado", label: "Treinamento cancelado" },
  { value: "concluido", label: "Concluído" },
  { value: "contrato_encerrado", label: "Contrato encerrado" },
];

export const IMPLANTACAO_ETAPA_LABELS: Record<ImplantacaoEtapaId, string> = {
  contrato: "Contrato",
  financeiro: "Aguardando pagamento",
  procuracao: "Aguardando procuração",
  funcionarios: "Lista de funcionários",
  logo: "Logo da empresa",
  visita: "Visita agendada",
  aguardando_agendamentos: "Aguardando agendamentos",
  agendamento_treinamento: "Agendamento do treinamento",
  treinamento_agendado: "Treinamento agendado",
  treinamento_cancelado: "Treinamento cancelado",
  concluido: "Concluído",
  contrato_encerrado: "Contrato encerrado",
};

/** Classe base compartilhada — só a cor muda por etapa. */
export const IMPLANTACAO_ETAPA_BADGE_BASE =
  "inline-flex h-6 max-w-full items-center justify-center rounded-full border px-2.5 text-[10px] font-semibold leading-none whitespace-nowrap";

export type ImplantacaoEtapaBadgeTone = {
  className: string;
  family:
    | "contrato"
    | "financeiro"
    | "procuracao"
    | "lista"
    | "logo"
    | "visita"
    | "agendamentos"
    | "treinamento"
    | "concluido"
    | "encerrado";
};

/**
 * Mapa visual único da coluna “Etapa atual”.
 * Fundo claro + texto escuro + borda suave da mesma família.
 */
export const IMPLANTACAO_ETAPA_BADGE: Record<
  ImplantacaoEtapaId,
  ImplantacaoEtapaBadgeTone
> = {
  // Azul — Contrato
  contrato: {
    family: "contrato",
    className: "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]",
  },
  // Laranja — Financeiro / Aguardando pagamento
  financeiro: {
    family: "financeiro",
    className: "border-[#fdba74] bg-[#ffedd5] text-[#c2410c]",
  },
  // Roxo — Procuração
  procuracao: {
    family: "procuracao",
    className: "border-[#d8b4fe] bg-[#f3e8ff] text-[#7e22ce]",
  },
  // Amarelo — Lista de funcionários
  funcionarios: {
    family: "lista",
    className: "border-[#fde047] bg-[#fef9c3] text-[#a16207]",
  },
  // Dourado — Logo da empresa
  logo: {
    family: "logo",
    className: "border-[#f0d78c] bg-[#fef6e0] text-[#92640a]",
  },
  // Marrom — Visita técnica
  visita: {
    family: "visita",
    className: "border-[#d6c3b0] bg-[#f5ebe0] text-[#7c4a2d]",
  },
  // Rosa — Aguardando agendamentos
  aguardando_agendamentos: {
    family: "agendamentos",
    className: "border-[#f9a8d4] bg-[#fce7f3] text-[#be185d]",
  },
  // Teal — Agendamento do treinamento
  agendamento_treinamento: {
    family: "treinamento",
    className: "border-[#99f6e4] bg-[#f0fdfa] text-[#0f766e]",
  },
  treinamento_agendado: {
    family: "treinamento",
    className: "border-[#5eead4] bg-[#ccfbf1] text-[#0f766e]",
  },
  treinamento_cancelado: {
    family: "encerrado",
    className: "border-[#fca5a5] bg-[#fee2e2] text-[#b91c1c]",
  },
  // Verde — Concluído
  concluido: {
    family: "concluido",
    className: "border-[#86efac] bg-[#dcfce7] text-[#15803d]",
  },
  // Vermelho — Contrato encerrado
  contrato_encerrado: {
    family: "encerrado",
    className: "border-[#fca5a5] bg-[#fee2e2] text-[#b91c1c]",
  },
};

export const IMPLANTACAO_AGENDAMENTO_BADGE = {
  Liberado: { className: "bg-brand-green-soft text-brand-green" },
  Bloqueado: { className: "bg-brand-red-soft text-brand-red" },
} as const;

export type ImplantacaoAndamentoFiltro = "em_andamento" | "concluidos" | "todos";

export type ImplantacaoSortKey =
  | "prioridade"
  | "aprovado_em"
  | "cliente"
  | "etapa"
  | "responsavel";

export interface ImplantacaoFilters {
  busca: string;
  responsavel: string;
  etapa: "" | ImplantacaoEtapaId;
  status: "" | OrcamentoStatus;
  origem: "" | OrcamentoOrigemCliente;
  aprovadoDe: string;
  aprovadoAte: string;
  andamento: ImplantacaoAndamentoFiltro;
  sort: ImplantacaoSortKey;
}

export const EMPTY_IMPLANTACAO_FILTERS: ImplantacaoFilters = {
  busca: "",
  responsavel: "",
  etapa: "",
  /** Padrão: só aprovados (oculta contrato encerrado ao entrar). */
  status: "aprovado",
  origem: "",
  aprovadoDe: "",
  aprovadoAte: "",
  andamento: "todos",
  sort: "etapa",
};

export interface ImplantacaoProcesso {
  orcamento: OrcamentoRecord;
  aprovacao: OrcamentoAprovacaoRecord | null;
  contrato: ClienteContratoRecord | null;
  etapaAtual: ImplantacaoEtapaId;
  etapasConcluidas: number;
  totalEtapas: number;
  progressoLabel: string;
  agendamentoLiberado: boolean;
  agendamentoLabel: "Liberado" | "Bloqueado";
  dataAprovacao: string | null;
  numeroContrato: string | null;
  ativo: boolean;
  quantidadeContratada: number;
  agendamentosRealizados: number;
  /** Exames futuros que também consomem vaga do contrato. */
  examesProgramadosFuturos: number;
  /** ASOs contratuais em aberto (status disponivel). */
  asosContratuaisEmAberto: number;
  /** Vagas ainda sem classificação (fonte da etapa Agendamentos). */
  pendentesDefinicao?: number | null;
  /** Vagas nomeadas ainda não agendadas/programadas/ASO. */
  vagasComprometidas?: number | null;
  agendamentosIniciaisDispensados: boolean;
  /**
   * Concluído porque a previsão foi preenchida com pelo menos um exame
   * programado para o futuro (não apenas agendamentos já feitos).
   */
  concluidoComExamesFuturos: boolean;
  fluxoImplantacao: OrcamentoFluxoImplantacao;
  treinamento: ImplantacaoTreinamentoRecord | null;
  etapasOperacionais: Array<{ id: ImplantacaoEtapaOperacionalId; label: string }>;
  /**
   * Orçamento aprovado contém o serviço principal "Pacote completo - SST".
   * Gatilho do encaminhamento automático para Laudos SST e Riscos.
   */
  possuiPacoteCompletoSst?: boolean;
}

export function resolveQuantidadeContratadaImplantacao(
  aprovacao: OrcamentoAprovacaoRecord | null,
  contrato: ClienteContratoRecord | null
): number {
  const fromAprovacao = Number(aprovacao?.quantidade_colaboradores);
  if (Number.isFinite(fromAprovacao) && fromAprovacao > 0) {
    return Math.floor(fromAprovacao);
  }
  const fromContrato = Number(contrato?.quantidade_colaboradores);
  if (Number.isFinite(fromContrato) && fromContrato > 0) {
    return Math.floor(fromContrato);
  }
  return 0;
}

export type ImplantacaoAgendamentosClassificacao = {
  pendentesDefinicao: number;
  vagasComprometidas: number;
};

/**
 * Etapa Agendamentos da lista: mesma regra da aba
 * (`isClassificacaoVagasContratoCompleta` — pendentesDefinicao === 0).
 * Dispensa dos agendamentos iniciais também conclui. Não usa progresso %.
 */
export function isAgendamentosImplantacaoConcluida(
  quantidadeContratada: number,
  agendamentosRealizados: number,
  dispensado = false,
  classificacao?: ImplantacaoAgendamentosClassificacao | null
): boolean {
  if (dispensado) return true;
  const qtd = Math.max(0, quantidadeContratada);
  if (qtd <= 0) return false;
  if (classificacao) {
    return isClassificacaoVagasContratoCompleta({
      previstos: qtd,
      pendentesDefinicao: classificacao.pendentesDefinicao,
    });
  }
  const feitos = Math.max(0, agendamentosRealizados);
  return feitos >= qtd;
}

function classificacaoAgendamentosFromOpts(opts?: {
  pendentesDefinicao?: number;
  vagasComprometidas?: number;
}): ImplantacaoAgendamentosClassificacao | null {
  if (opts?.pendentesDefinicao == null) {
    return null;
  }
  return {
    pendentesDefinicao: opts.pendentesDefinicao,
    vagasComprometidas: opts.vagasComprometidas ?? 0,
  };
}

export function resolveImplantacaoEtapaAtual(
  aprovacao: OrcamentoAprovacaoRecord | null,
  opts?: {
    quantidadeContratada?: number;
    agendamentosRealizados?: number;
    agendamentosDispensados?: boolean;
    pendentesDefinicao?: number;
    vagasComprometidas?: number;
    orcamentoStatus?: OrcamentoStatus;
    contratoStatus?: string | null;
    contratoEncerradoEm?: string | null;
    fluxo?: OrcamentoFluxoImplantacao;
    treinamento?: ImplantacaoTreinamentoRecord | null;
  }
): ImplantacaoEtapaId {
  if (
    opts?.orcamentoStatus === "contrato_encerrado" ||
    opts?.contratoStatus === "encerrado" ||
    Boolean(opts?.contratoEncerradoEm)
  ) {
    return "contrato_encerrado";
  }

  const fluxo = opts?.fluxo ?? "padrao";
  const treino = opts?.treinamento ?? null;

  if (fluxo === "somente_treinamentos") {
    if (isTreinamentoCancelado(treino)) return "treinamento_cancelado";
    if (!isContratoEtapaConcluida(aprovacao)) return "contrato";
    if (!isFinanceiroEtapaConcluida(aprovacao)) return "financeiro";
    if (!isTreinamentoEtapaConcluida(treino)) return "agendamento_treinamento";
    if (treino?.status === "realizado") return "concluido";
    return "treinamento_agendado";
  }

  if (!isContratoEtapaConcluida(aprovacao)) return "contrato";
  if (!isFinanceiroEtapaConcluida(aprovacao)) return "financeiro";

  if (fluxo === "combinado") {
    if (isTreinamentoCancelado(treino)) return "treinamento_cancelado";
    // Continua o fluxo SST; treinamento pode avançar em paralelo após financeiro.
  }

  if (!isProcuracaoEtapaConcluida(aprovacao)) return "procuracao";
  if (!isFuncionariosEtapaConcluida(aprovacao)) return "funcionarios";
  if (!isLogoEtapaConcluida(aprovacao)) return "logo";
  if (!isVisitaEtapaConcluida(aprovacao)) return "visita";
  const qtd = Math.max(0, opts?.quantidadeContratada ?? 0);
  const feitos = Math.max(0, opts?.agendamentosRealizados ?? 0);
  const agendamentosOk = isAgendamentosImplantacaoConcluida(
    qtd,
    feitos,
    Boolean(opts?.agendamentosDispensados),
    classificacaoAgendamentosFromOpts(opts)
  );

  if (fluxo === "combinado") {
    const treinoOk = isTreinamentoEtapaConcluida(treino);
    if (agendamentosOk && treinoOk) {
      if (treino?.status === "realizado") return "concluido";
      return "treinamento_agendado";
    }
    if (agendamentosOk && !treinoOk) return "agendamento_treinamento";
    return "aguardando_agendamentos";
  }

  if (agendamentosOk) return "concluido";
  return "aguardando_agendamentos";
}

export function countImplantacaoEtapasConcluidas(
  aprovacao: OrcamentoAprovacaoRecord | null,
  opts?: {
    quantidadeContratada?: number;
    agendamentosRealizados?: number;
    agendamentosDispensados?: boolean;
    pendentesDefinicao?: number;
    vagasComprometidas?: number;
    fluxo?: OrcamentoFluxoImplantacao;
    treinamento?: ImplantacaoTreinamentoRecord | null;
    /** Para fluxo somente_treinamentos: conta as 5 abas (inclui resumo/aprovado). */
    orcamentoAprovado?: boolean;
  }
): number {
  const fluxo = opts?.fluxo ?? "padrao";

  if (fluxo === "somente_treinamentos") {
    let n = 0;
    // Resumo + Orçamento aprovado (sempre contam no progresso 5 etapas)
    n += 1;
    if (opts?.orcamentoAprovado || aprovacao) n += 1;
    if (isContratoEtapaConcluida(aprovacao)) n += 1;
    if (isFinanceiroEtapaConcluida(aprovacao)) n += 1;
    if (isTreinamentoEtapaConcluida(opts?.treinamento)) n += 1;
    return n;
  }

  let n = 0;
  if (isContratoEtapaConcluida(aprovacao)) n += 1;
  if (isFinanceiroEtapaConcluida(aprovacao)) n += 1;
  if (fluxo === "combinado" && isTreinamentoEtapaConcluida(opts?.treinamento)) {
    n += 1;
  }
  if (isProcuracaoEtapaConcluida(aprovacao)) n += 1;
  if (isFuncionariosEtapaConcluida(aprovacao)) n += 1;
  if (isLogoEtapaConcluida(aprovacao)) n += 1;
  if (isVisitaEtapaConcluida(aprovacao)) n += 1;
  if (
    isAgendamentosImplantacaoConcluida(
      opts?.quantidadeContratada ?? 0,
      opts?.agendamentosRealizados ?? 0,
      Boolean(opts?.agendamentosDispensados),
      classificacaoAgendamentosFromOpts(opts)
    )
  ) {
    n += 1;
  }
  return n;
}

export function implantacaoEtapaToModalTab(
  etapa: ImplantacaoEtapaId
): OrcamentoEtapaId {
  if (
    etapa === "concluido" ||
    etapa === "aguardando_agendamentos" ||
    etapa === "contrato_encerrado"
  ) {
    return "agendamentos";
  }
  if (
    etapa === "agendamento_treinamento" ||
    etapa === "treinamento_agendado" ||
    etapa === "treinamento_cancelado"
  ) {
    return "treinamento";
  }
  return etapa;
}

export function buildImplantacaoProcesso(params: {
  orcamento: OrcamentoRecord;
  aprovacao: OrcamentoAprovacaoRecord | null;
  contrato: ClienteContratoRecord | null;
  agendamentosRealizados?: number;
  examesProgramadosFuturos?: number;
  asosContratuaisEmAberto?: number;
  pendentesDefinicao?: number;
  vagasComprometidas?: number;
  fluxoImplantacao?: OrcamentoFluxoImplantacao;
  treinamento?: ImplantacaoTreinamentoRecord | null;
  possuiPacoteCompletoSst?: boolean;
}): ImplantacaoProcesso {
  const { orcamento, aprovacao, contrato } = params;
  const fluxo = params.fluxoImplantacao ?? "padrao";
  const treinamento = params.treinamento ?? null;
  const etapasOperacionais = buildImplantacaoEtapasOperacionais(fluxo);
  const quantidadeContratada = resolveQuantidadeContratadaImplantacao(
    aprovacao,
    contrato
  );
  const examesProgramadosFuturos = Math.max(
    0,
    params.examesProgramadosFuturos ?? 0
  );
  const asosContratuaisEmAberto = Math.max(
    0,
    params.asosContratuaisEmAberto ?? 0
  );
  const agendamentosRealizados = Math.max(
    0,
    (params.agendamentosRealizados ?? 0) +
      examesProgramadosFuturos +
      asosContratuaisEmAberto
  );
  const agendamentosIniciaisDispensados = Boolean(
    contrato?.agendamentos_iniciais_dispensados
  );
  const pendentesDefinicao = Math.max(0, params.pendentesDefinicao ?? 0);
  const vagasComprometidas = Math.max(0, params.vagasComprometidas ?? 0);
  const temClassificacaoVagas = params.pendentesDefinicao != null;
  const contagemOpts = {
    quantidadeContratada,
    agendamentosRealizados,
    agendamentosDispensados: agendamentosIniciaisDispensados,
    pendentesDefinicao: temClassificacaoVagas ? pendentesDefinicao : undefined,
    vagasComprometidas: temClassificacaoVagas ? vagasComprometidas : undefined,
    orcamentoStatus: orcamento.status,
    contratoStatus: contrato?.status ?? null,
    contratoEncerradoEm: contrato?.encerrado_em ?? null,
    fluxo,
    treinamento,
    orcamentoAprovado:
      orcamento.status === "aprovado" || Boolean(aprovacao),
  };
  const etapaAtual = resolveImplantacaoEtapaAtual(aprovacao, contagemOpts);
  const etapasConcluidas =
    etapaAtual === "contrato_encerrado"
      ? 0
      : countImplantacaoEtapasConcluidas(aprovacao, contagemOpts);
  const totalEtapas =
    fluxo === "somente_treinamentos"
      ? 5
      : etapasOperacionais.length;
  const agendamentoLiberado =
    etapaAtual === "contrato_encerrado" ||
    etapaAtual === "treinamento_cancelado"
      ? false
      : fluxo === "somente_treinamentos"
        ? false
        : contrato
          ? contratoLiberaAgendamento(contrato)
          : false;
  const cancelado =
    orcamento.status === "cancelado" ||
    orcamento.status === "contrato_encerrado";
  const concluido =
    etapaAtual === "concluido" ||
    etapaAtual === "treinamento_agendado";
  const concluidoComExamesFuturos =
    etapaAtual === "concluido" &&
    !agendamentosIniciaisDispensados &&
    examesProgramadosFuturos > 0;

  return {
    orcamento,
    aprovacao,
    contrato,
    etapaAtual,
    etapasConcluidas,
    totalEtapas,
    progressoLabel:
      etapaAtual === "contrato_encerrado"
        ? "Contrato encerrado"
        : `${etapasConcluidas} de ${totalEtapas}`,
    agendamentoLiberado,
    agendamentoLabel: labelAgendamentoLiberacao(agendamentoLiberado),
    dataAprovacao: aprovacao?.aprovado_em ?? null,
    numeroContrato: contrato?.numero ?? null,
    ativo: !cancelado && !concluido,
    quantidadeContratada,
    agendamentosRealizados,
    examesProgramadosFuturos,
    asosContratuaisEmAberto,
    pendentesDefinicao: temClassificacaoVagas ? pendentesDefinicao : null,
    vagasComprometidas: temClassificacaoVagas ? vagasComprometidas : null,
    agendamentosIniciaisDispensados,
    concluidoComExamesFuturos,
    fluxoImplantacao: fluxo,
    treinamento,
    etapasOperacionais,
    possuiPacoteCompletoSst: Boolean(params.possuiPacoteCompletoSst),
  };
}

export interface ImplantacaoSummaryStats {
  totalEmImplantacao: number;
  aguardandoContrato: number;
  aguardandoPagamento: number;
  aguardandoDocumentos: number;
  liberadosAgendamento: number;
}

/** Contadores sobre processos aprovados (exclui cancelados do total ativo). */
export function computeImplantacaoSummary(
  processos: ImplantacaoProcesso[]
): ImplantacaoSummaryStats {
  const ativos = processos.filter(
    (p) =>
      p.orcamento.status !== "cancelado" &&
      p.orcamento.status !== "contrato_encerrado" &&
      p.etapaAtual !== "contrato_encerrado"
  );

  return {
    totalEmImplantacao: ativos.filter(
      (p) =>
        p.etapaAtual !== "concluido" &&
        p.etapaAtual !== "treinamento_agendado"
    ).length,
    aguardandoContrato: ativos.filter((p) => p.etapaAtual === "contrato")
      .length,
    aguardandoPagamento: ativos.filter((p) => p.etapaAtual === "financeiro")
      .length,
    aguardandoDocumentos: ativos.filter((p) =>
      ["procuracao", "funcionarios", "logo"].includes(p.etapaAtual)
    ).length,
    liberadosAgendamento: ativos.filter((p) => p.agendamentoLiberado).length,
  };
}

function normalizeBusca(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function filterImplantacaoProcessos(
  processos: ImplantacaoProcesso[],
  filters: ImplantacaoFilters
): ImplantacaoProcesso[] {
  const busca = normalizeBusca(filters.busca);
  const buscaDigits = digitsOnly(filters.busca);

  let list = processos.filter((p) => {
    const { orcamento, etapaAtual, dataAprovacao, numeroContrato } = p;

    const filtrandoEncerrado = filters.status === "contrato_encerrado";

    if (filters.andamento === "em_andamento") {
      // Status "Contrato encerrado" sobrescreve o padrão e mostra esses registros.
      if (!filtrandoEncerrado) {
        if (
          orcamento.status === "cancelado" ||
          orcamento.status === "contrato_encerrado" ||
          etapaAtual === "contrato_encerrado"
        ) {
          return false;
        }
      }
      if (etapaAtual === "concluido" || etapaAtual === "treinamento_agendado") {
        return false;
      }
    } else if (filters.andamento === "concluidos") {
      if (
        etapaAtual !== "concluido" &&
        etapaAtual !== "treinamento_agendado"
      ) {
        return false;
      }
    }

    if (filters.etapa && etapaAtual !== filters.etapa) return false;
    if (filters.status && orcamento.status !== filters.status) return false;
    if (filters.origem && orcamento.origem_cliente !== filters.origem) {
      return false;
    }
    if (
      filters.responsavel &&
      orcamento.responsavel !== filters.responsavel
    ) {
      return false;
    }

    if (filters.aprovadoDe || filters.aprovadoAte) {
      if (!dataAprovacao) return false;
      const day = dataAprovacao.slice(0, 10);
      if (filters.aprovadoDe && day < filters.aprovadoDe) return false;
      if (filters.aprovadoAte && day > filters.aprovadoAte) return false;
    }

    if (busca || buscaDigits) {
      const haystack = normalizeBusca(
        [
          orcamento.numero,
          numeroContrato ?? "",
          orcamento.cliente_nome,
          orcamento.cliente_cnpj ?? "",
        ].join(" ")
      );
      const cnpjDigits = digitsOnly(orcamento.cliente_cnpj);
      const matchText = busca ? haystack.includes(busca) : false;
      const matchCnpj =
        buscaDigits.length > 0 && cnpjDigits.includes(buscaDigits);
      if (!matchText && !matchCnpj) return false;
    }

    return true;
  });

  list = sortImplantacaoProcessos(list, filters.sort);
  return list;
}

const ETAPA_SORT_ORDER: Record<ImplantacaoEtapaId, number> = {
  contrato: 1,
  financeiro: 2,
  procuracao: 3,
  funcionarios: 4,
  logo: 5,
  visita: 6,
  aguardando_agendamentos: 7,
  agendamento_treinamento: 7,
  treinamento_agendado: 8,
  concluido: 8,
  treinamento_cancelado: 9,
  contrato_encerrado: 10,
};

export function sortImplantacaoProcessos(
  processos: ImplantacaoProcesso[],
  sort: ImplantacaoSortKey
): ImplantacaoProcesso[] {
  const copy = [...processos];

  copy.sort((a, b) => {
    if (sort === "cliente") {
      return a.orcamento.cliente_nome.localeCompare(b.orcamento.cliente_nome, "pt-BR");
    }
    if (sort === "responsavel") {
      return a.orcamento.responsavel.localeCompare(b.orcamento.responsavel, "pt-BR");
    }
    if (sort === "etapa") {
      return ETAPA_SORT_ORDER[a.etapaAtual] - ETAPA_SORT_ORDER[b.etapaAtual];
    }
    if (sort === "aprovado_em") {
      return comparePorDataAprovacaoENumero(a, b);
    }

    const score = (p: ImplantacaoProcesso) => {
      if (
        p.orcamento.status === "cancelado" ||
        p.orcamento.status === "contrato_encerrado" ||
        p.etapaAtual === "contrato_encerrado"
      ) {
        return 3;
      }
      if (p.etapaAtual === "concluido" || p.etapaAtual === "treinamento_agendado") {
        return 2;
      }
      return 1;
    };
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    return comparePorDataAprovacaoENumero(a, b);
  });

  return copy;
}

function comparePorDataAprovacaoENumero(
  a: ImplantacaoProcesso,
  b: ImplantacaoProcesso
): number {
  const da = (a.dataAprovacao ?? "9999-12-31").slice(0, 10);
  const db = (b.dataAprovacao ?? "9999-12-31").slice(0, 10);
  const byDate = da.localeCompare(db);
  if (byDate !== 0) return byDate;
  return a.orcamento.numero.localeCompare(b.orcamento.numero, "pt-BR");
}

/** Dentro da aba mensal: mais antigo primeiro; número do orçamento como desempate. */
export function sortImplantacaoProcessosPorDataAprovacao(
  processos: ImplantacaoProcesso[]
): ImplantacaoProcesso[] {
  return [...processos].sort(comparePorDataAprovacaoENumero);
}

/** Filtra pela data de aprovação (`dataAprovacao` / coluna “Data da aprovação”). */
export function filterImplantacaoProcessosPorMes(
  processos: ImplantacaoProcesso[],
  mes: ImplantacaoYearMonth
): ImplantacaoProcesso[] {
  return processos.filter((p) =>
    processoBelongsToMesAprovacao(p.dataAprovacao, mes)
  );
}

export type ImplantacaoEtapaVisualEstado =
  | "concluida"
  | "atual"
  | "bloqueada";

export function resolveImplantacaoEtapaVisual(
  etapa: ImplantacaoEtapaOperacionalId,
  etapaAtual: ImplantacaoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null,
  opts?: {
    quantidadeContratada?: number;
    agendamentosRealizados?: number;
    agendamentosDispensados?: boolean;
    pendentesDefinicao?: number;
    vagasComprometidas?: number;
    treinamento?: ImplantacaoTreinamentoRecord | null;
  }
): ImplantacaoEtapaVisualEstado {
  const agendamentosDone = isAgendamentosImplantacaoConcluida(
    opts?.quantidadeContratada ?? 0,
    opts?.agendamentosRealizados ?? 0,
    Boolean(opts?.agendamentosDispensados),
    classificacaoAgendamentosFromOpts(opts)
  );
  const treinamentoDone = isTreinamentoEtapaConcluida(opts?.treinamento);

  const doneMap: Record<ImplantacaoEtapaOperacionalId, boolean> = {
    contrato: isContratoEtapaConcluida(aprovacao),
    financeiro: isFinanceiroEtapaConcluida(aprovacao),
    procuracao: isProcuracaoEtapaConcluida(aprovacao),
    funcionarios: isFuncionariosEtapaConcluida(aprovacao),
    logo: isLogoEtapaConcluida(aprovacao),
    visita: isVisitaEtapaConcluida(aprovacao),
    agendamentos: agendamentosDone,
    treinamento: treinamentoDone,
  };

  if (doneMap[etapa]) return "concluida";

  if (etapa === "agendamentos") {
    if (etapaAtual === "aguardando_agendamentos") return "atual";
    return "bloqueada";
  }

  if (etapa === "treinamento") {
    if (
      etapaAtual === "agendamento_treinamento" ||
      etapaAtual === "treinamento_agendado" ||
      etapaAtual === "treinamento_cancelado"
    ) {
      return "atual";
    }
    return "bloqueada";
  }

  if (etapaAtual === etapa) return "atual";
  return "bloqueada";
}
