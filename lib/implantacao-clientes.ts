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
export type ImplantacaoEtapaId =
  | "contrato"
  | "financeiro"
  | "procuracao"
  | "funcionarios"
  | "logo"
  | "visita"
  | "concluido";

export const IMPLANTACAO_ETAPAS_OPERACIONAIS: Array<{
  id: Exclude<ImplantacaoEtapaId, "concluido">;
  label: string;
}> = [
  { id: "contrato", label: "Contrato" },
  { id: "financeiro", label: "Financeiro" },
  { id: "procuracao", label: "Procuração" },
  { id: "funcionarios", label: "Lista de funcionários" },
  { id: "logo", label: "Logo da empresa" },
  { id: "visita", label: "Visita técnica" },
];

export const IMPLANTACAO_ETAPA_OPTIONS: Array<{
  value: ImplantacaoEtapaId;
  label: string;
}> = [
  ...IMPLANTACAO_ETAPAS_OPERACIONAIS.map((e) => ({
    value: e.id as ImplantacaoEtapaId,
    label: e.label,
  })),
  { value: "concluido", label: "Concluído" },
];

export const IMPLANTACAO_ETAPA_LABELS: Record<ImplantacaoEtapaId, string> = {
  contrato: "Contrato",
  financeiro: "Financeiro",
  procuracao: "Procuração",
  funcionarios: "Lista de funcionários",
  logo: "Logo da empresa",
  visita: "Visita técnica",
  concluido: "Concluído",
};

export const IMPLANTACAO_ETAPA_BADGE: Record<
  ImplantacaoEtapaId,
  { className: string }
> = {
  contrato: { className: "bg-brand-blue-soft text-brand-blue" },
  financeiro: { className: "bg-[#fef3c7] text-[#b45309]" },
  procuracao: { className: "bg-[#f3e8ff] text-[#7e22ce]" },
  funcionarios: { className: "bg-[#ffedd5] text-[#c2410c]" },
  logo: { className: "bg-[#f1f5f9] text-[#64748b]" },
  visita: { className: "bg-[#e0f2fe] text-[#0369a1]" },
  concluido: { className: "bg-brand-green-soft text-brand-green" },
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
  status: "",
  origem: "",
  aprovadoDe: "",
  aprovadoAte: "",
  andamento: "em_andamento",
  sort: "prioridade",
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
}

export function resolveImplantacaoEtapaAtual(
  aprovacao: OrcamentoAprovacaoRecord | null
): ImplantacaoEtapaId {
  if (!isContratoEtapaConcluida(aprovacao)) return "contrato";
  if (!isFinanceiroEtapaConcluida(aprovacao)) return "financeiro";
  if (!isProcuracaoEtapaConcluida(aprovacao)) return "procuracao";
  if (!isFuncionariosEtapaConcluida(aprovacao)) return "funcionarios";
  if (!isLogoEtapaConcluida(aprovacao)) return "logo";
  if (!isVisitaEtapaConcluida(aprovacao)) return "visita";
  return "concluido";
}

export function countImplantacaoEtapasConcluidas(
  aprovacao: OrcamentoAprovacaoRecord | null
): number {
  let n = 0;
  if (isContratoEtapaConcluida(aprovacao)) n += 1;
  if (isFinanceiroEtapaConcluida(aprovacao)) n += 1;
  if (isProcuracaoEtapaConcluida(aprovacao)) n += 1;
  if (isFuncionariosEtapaConcluida(aprovacao)) n += 1;
  if (isLogoEtapaConcluida(aprovacao)) n += 1;
  if (isVisitaEtapaConcluida(aprovacao)) n += 1;
  return n;
}

export function implantacaoEtapaToModalTab(
  etapa: ImplantacaoEtapaId
): OrcamentoEtapaId {
  if (etapa === "concluido") return "visita";
  return etapa;
}

export function buildImplantacaoProcesso(params: {
  orcamento: OrcamentoRecord;
  aprovacao: OrcamentoAprovacaoRecord | null;
  contrato: ClienteContratoRecord | null;
}): ImplantacaoProcesso {
  const { orcamento, aprovacao, contrato } = params;
  const etapaAtual = resolveImplantacaoEtapaAtual(aprovacao);
  const etapasConcluidas = countImplantacaoEtapasConcluidas(aprovacao);
  const totalEtapas = IMPLANTACAO_ETAPAS_OPERACIONAIS.length;
  const agendamentoLiberado = contrato
    ? contratoLiberaAgendamento(contrato)
    : false;
  const cancelado = orcamento.status === "cancelado";
  const concluido = etapaAtual === "concluido";

  return {
    orcamento,
    aprovacao,
    contrato,
    etapaAtual,
    etapasConcluidas,
    totalEtapas,
    progressoLabel: `${etapasConcluidas} de ${totalEtapas}`,
    agendamentoLiberado,
    agendamentoLabel: labelAgendamentoLiberacao(agendamentoLiberado),
    dataAprovacao: aprovacao?.aprovado_em ?? null,
    numeroContrato: contrato?.numero ?? null,
    ativo: !cancelado && !concluido,
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
  const ativos = processos.filter((p) => p.orcamento.status !== "cancelado");

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

    if (filters.andamento === "em_andamento") {
      if (orcamento.status === "cancelado") return false;
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
  concluido: 7,
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
      return (a.dataAprovacao ?? "").localeCompare(b.dataAprovacao ?? "");
    }

    // prioridade: pendentes antigos primeiro; concluídos e cancelados por último
    const score = (p: ImplantacaoProcesso) => {
      if (p.orcamento.status === "cancelado") return 3;
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
  etapa: Exclude<ImplantacaoEtapaId, "concluido">,
  etapaAtual: ImplantacaoEtapaId,
  aprovacao: OrcamentoAprovacaoRecord | null
): ImplantacaoEtapaVisualEstado {
  const doneMap: Record<Exclude<ImplantacaoEtapaId, "concluido">, boolean> = {
    contrato: isContratoEtapaConcluida(aprovacao),
    financeiro: isFinanceiroEtapaConcluida(aprovacao),
    procuracao: isProcuracaoEtapaConcluida(aprovacao),
    funcionarios: isFuncionariosEtapaConcluida(aprovacao),
    logo: isLogoEtapaConcluida(aprovacao),
    visita: isVisitaEtapaConcluida(aprovacao),
  };

  if (doneMap[etapa]) return "concluida";
  if (etapaAtual === etapa) return "atual";
  return "bloqueada";
}
