import {
  isContratoEtapaConcluida,
  isFinanceiroEtapaConcluida,
  isFuncionariosEtapaConcluida,
  isLogoEtapaConcluida,
  isProcuracaoEtapaConcluida,
  isVisitaEtapaConcluida,
  type OrcamentoEtapaId,
} from "@/lib/orcamento-etapas";
import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import type { OrcamentoOrigemCliente } from "@/lib/orcamento-origem";
import type { OrcamentoRecord, OrcamentoStatus } from "@/lib/orcamento-types";
import type { ClienteContratoRecord } from "@/lib/types";
import {
  contratoLiberaAgendamento,
  labelAgendamentoLiberacao,
} from "@/lib/cliente-pode-agendar";

/** Etapas operacionais da implantação (pós-aprovação). */
export type ImplantacaoEtapaOperacionalId =
  | "contrato"
  | "financeiro"
  | "procuracao"
  | "funcionarios"
  | "logo"
  | "visita"
  | "agendamentos";

export type ImplantacaoEtapaId =
  | Exclude<ImplantacaoEtapaOperacionalId, "agendamentos">
  | "aguardando_agendamentos"
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
  sort: "aprovado_em",
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
  agendamentosIniciaisDispensados: boolean;
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

export function isAgendamentosImplantacaoConcluida(
  quantidadeContratada: number,
  agendamentosRealizados: number,
  dispensado = false
): boolean {
  if (dispensado) return true;
  const qtd = Math.max(0, quantidadeContratada);
  const feitos = Math.max(0, agendamentosRealizados);
  if (qtd <= 0) return false;
  return feitos >= qtd;
}

export function resolveImplantacaoEtapaAtual(
  aprovacao: OrcamentoAprovacaoRecord | null,
  opts?: {
    quantidadeContratada?: number;
    agendamentosRealizados?: number;
    agendamentosDispensados?: boolean;
    orcamentoStatus?: OrcamentoStatus;
    contratoStatus?: string | null;
    contratoEncerradoEm?: string | null;
  }
): ImplantacaoEtapaId {
  if (
    opts?.orcamentoStatus === "contrato_encerrado" ||
    opts?.contratoStatus === "encerrado" ||
    Boolean(opts?.contratoEncerradoEm)
  ) {
    return "contrato_encerrado";
  }
  if (!isContratoEtapaConcluida(aprovacao)) return "contrato";
  if (!isFinanceiroEtapaConcluida(aprovacao)) return "financeiro";
  if (!isProcuracaoEtapaConcluida(aprovacao)) return "procuracao";
  if (!isFuncionariosEtapaConcluida(aprovacao)) return "funcionarios";
  if (!isLogoEtapaConcluida(aprovacao)) return "logo";
  if (!isVisitaEtapaConcluida(aprovacao)) return "visita";
  const qtd = Math.max(0, opts?.quantidadeContratada ?? 0);
  const feitos = Math.max(0, opts?.agendamentosRealizados ?? 0);
  if (
    isAgendamentosImplantacaoConcluida(
      qtd,
      feitos,
      Boolean(opts?.agendamentosDispensados)
    )
  ) {
    return "concluido";
  }
  return "aguardando_agendamentos";
}

export function countImplantacaoEtapasConcluidas(
  aprovacao: OrcamentoAprovacaoRecord | null,
  opts?: {
    quantidadeContratada?: number;
    agendamentosRealizados?: number;
    agendamentosDispensados?: boolean;
  }
): number {
  let n = 0;
  if (isContratoEtapaConcluida(aprovacao)) n += 1;
  if (isFinanceiroEtapaConcluida(aprovacao)) n += 1;
  if (isProcuracaoEtapaConcluida(aprovacao)) n += 1;
  if (isFuncionariosEtapaConcluida(aprovacao)) n += 1;
  if (isLogoEtapaConcluida(aprovacao)) n += 1;
  if (isVisitaEtapaConcluida(aprovacao)) n += 1;
  if (
    isAgendamentosImplantacaoConcluida(
      opts?.quantidadeContratada ?? 0,
      opts?.agendamentosRealizados ?? 0,
      Boolean(opts?.agendamentosDispensados)
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
  return etapa;
}

export function buildImplantacaoProcesso(params: {
  orcamento: OrcamentoRecord;
  aprovacao: OrcamentoAprovacaoRecord | null;
  contrato: ClienteContratoRecord | null;
  agendamentosRealizados?: number;
}): ImplantacaoProcesso {
  const { orcamento, aprovacao, contrato } = params;
  const quantidadeContratada = resolveQuantidadeContratadaImplantacao(
    aprovacao,
    contrato
  );
  const agendamentosRealizados = Math.max(
    0,
    params.agendamentosRealizados ?? 0
  );
  const agendamentosIniciaisDispensados = Boolean(
    contrato?.agendamentos_iniciais_dispensados
  );
  const contagemOpts = {
    quantidadeContratada,
    agendamentosRealizados,
    agendamentosDispensados: agendamentosIniciaisDispensados,
    orcamentoStatus: orcamento.status,
    contratoStatus: contrato?.status ?? null,
    contratoEncerradoEm: contrato?.encerrado_em ?? null,
  };
  const etapaAtual = resolveImplantacaoEtapaAtual(aprovacao, contagemOpts);
  const etapasConcluidas =
    etapaAtual === "contrato_encerrado"
      ? 0
      : countImplantacaoEtapasConcluidas(aprovacao, contagemOpts);
  const totalEtapas = IMPLANTACAO_ETAPAS_OPERACIONAIS.length;
  const agendamentoLiberado =
    etapaAtual === "contrato_encerrado"
      ? false
      : contrato
        ? contratoLiberaAgendamento(contrato)
        : false;
  const cancelado =
    orcamento.status === "cancelado" ||
    orcamento.status === "contrato_encerrado";
  const concluido = etapaAtual === "concluido";

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
    agendamentosIniciaisDispensados,
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
    totalEmImplantacao: ativos.filter((p) => p.etapaAtual !== "concluido")
      .length,
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
      if (etapaAtual === "concluido") return false;
    } else if (filters.andamento === "concluidos") {
      if (etapaAtual !== "concluido") return false;
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
  concluido: 8,
  contrato_encerrado: 9,
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
      const da = a.dataAprovacao ?? "9999-12-31";
      const db = b.dataAprovacao ?? "9999-12-31";
      return da.localeCompare(db);
    }

    const score = (p: ImplantacaoProcesso) => {
      if (
        p.orcamento.status === "cancelado" ||
        p.orcamento.status === "contrato_encerrado" ||
        p.etapaAtual === "contrato_encerrado"
      ) {
        return 3;
      }
      if (p.etapaAtual === "concluido") return 2;
      return 1;
    };
    const sa = score(a);
    const sb = score(b);
    if (sa !== sb) return sa - sb;
    return (a.dataAprovacao ?? "").localeCompare(b.dataAprovacao ?? "");
  });

  return copy;
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
  }
): ImplantacaoEtapaVisualEstado {
  const agendamentosDone = isAgendamentosImplantacaoConcluida(
    opts?.quantidadeContratada ?? 0,
    opts?.agendamentosRealizados ?? 0,
    Boolean(opts?.agendamentosDispensados)
  );

  const doneMap: Record<ImplantacaoEtapaOperacionalId, boolean> = {
    contrato: isContratoEtapaConcluida(aprovacao),
    financeiro: isFinanceiroEtapaConcluida(aprovacao),
    procuracao: isProcuracaoEtapaConcluida(aprovacao),
    funcionarios: isFuncionariosEtapaConcluida(aprovacao),
    logo: isLogoEtapaConcluida(aprovacao),
    visita: isVisitaEtapaConcluida(aprovacao),
    agendamentos: agendamentosDone,
  };

  if (doneMap[etapa]) return "concluida";

  if (etapa === "agendamentos") {
    if (etapaAtual === "aguardando_agendamentos") return "atual";
    return "bloqueada";
  }

  if (etapaAtual === etapa) return "atual";
  return "bloqueada";
}
