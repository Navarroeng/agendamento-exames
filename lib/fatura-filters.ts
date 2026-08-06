import {
  formatDateIsoToBR,
  parseMonthYearBRToIsoRange,
} from "@/lib/agendamento-datetime";
import { filterAgendamentosElegiveisFatura } from "@/lib/fatura-elegibilidade";
import {
  isAgendamentoDaClinica,
  isAgendamentoDaEmpresa,
  type ClienteCatalogItem,
} from "@/lib/fatura-empresa-match";
import { faturaStatusEmissaoAtiva } from "@/lib/fatura-reemissao";
import { formatDateBR } from "@/lib/format";
import type { AgendamentoWithExames, FaturaRecord } from "@/lib/types";

export type FaturaMesStatusFilter =
  | ""
  | "aberta_emissao"
  | "rascunho"
  | "emitida"
  | "vencida"
  | "paga"
  | "cancelada"
  | "necessita_reemissao"
  | "substituida"
  | "reemitida";

export interface FaturaFilters {
  mesReferencia: string;
  dataVencimento: string;
  cliente: string;
  clinica: string;
  responsavel: string;
  status: FaturaMesStatusFilter;
}

export const EMPTY_FATURA_FILTERS: FaturaFilters = {
  mesReferencia: "",
  dataVencimento: "",
  cliente: "",
  clinica: "",
  responsavel: "",
  status: "",
};

export type FaturaHistoricoStatusFilter =
  | ""
  | "rascunho"
  | "emitida"
  | "vencida"
  | "cancelada"
  | "paga"
  | "pendente";

export interface FaturaHistoricoFilters {
  tipo: "" | "cliente" | "clinica";
  referencia: string;
  mesReferencia: string;
  status: FaturaHistoricoStatusFilter;
}

export const EMPTY_FATURA_HISTORICO_FILTERS: FaturaHistoricoFilters = {
  tipo: "",
  referencia: "",
  mesReferencia: "",
  status: "",
};

export function emptyHistoricoFiltersForTipo(
  tipo: "cliente" | "clinica"
): FaturaHistoricoFilters {
  return {
    ...EMPTY_FATURA_HISTORICO_FILTERS,
    tipo,
  };
}

export const FATURA_HISTORICO_PAGE_SIZE = 10;

export interface FaturaLinhaCliente {
  data: string;
  colaborador: string;
  aso: string;
  clinica: string;
  exame: string;
  valorCliente: number;
}

export interface FaturaLinhaClinica {
  data: string;
  colaborador: string;
  cliente: string;
  aso: string;
  exame: string;
  custoClinica: number;
}

function matchesDateRangeIso(
  isoDate: string,
  inicioIso: string | null,
  fimIso: string | null
): boolean {
  const data = isoDate.split("T")[0];
  if (inicioIso && data < inicioIso) return false;
  if (fimIso && data > fimIso) return false;
  return true;
}

function matchesText(value: string, filter: string): boolean {
  const f = filter.trim().toLowerCase();
  if (!f) return true;
  return value.toLowerCase().includes(f);
}

/** MM/AAAA → YYYY-MM (competência da fatura). */
export function mesReferenciaIsoFromBR(mesReferencia: string): string | null {
  const range = parseMonthYearBRToIsoRange(mesReferencia);
  if (!range) return null;
  return range.inicio.slice(0, 7);
}

export function faturaMatchesMesReferencia(
  fatura: FaturaRecord,
  mesReferencia: string
): boolean {
  const mesIso = mesReferenciaIsoFromBR(mesReferencia);
  if (!mesIso) return true;

  const mesRef = fatura.mes_referencia?.trim();
  if (mesRef) return mesRef === mesIso;

  const inicio = fatura.periodo_inicio?.split("T")[0];
  if (!inicio) return false;
  return inicio.slice(0, 7) === mesIso;
}

export function filterAgendamentosFatura(
  agendamentos: AgendamentoWithExames[],
  filters: FaturaFilters,
  opts?: {
    /** Catálogo para resolver cliente_id/CNPJ no pertencimento exato. */
    clientesCatalog?: ClienteCatalogItem[];
    /**
     * partial = busca de UI (includes).
     * exact = pertencimento à empresa/clínica da fatura (sem substring).
     * Default: partial para filtros de tela; use exact ao montar fatura de uma referência.
     */
    clienteMatch?: "partial" | "exact";
    clinicaMatch?: "partial" | "exact";
  }
): AgendamentoWithExames[] {
  const range = filters.mesReferencia.trim()
    ? parseMonthYearBRToIsoRange(filters.mesReferencia)
    : null;
  const clienteMatch = opts?.clienteMatch ?? "partial";
  const clinicaMatch = opts?.clinicaMatch ?? "partial";
  const catalog = opts?.clientesCatalog;

  return filterAgendamentosElegiveisFatura(agendamentos).filter((item) => {
    if (
      !matchesDateRangeIso(
        item.data_agendamento,
        range?.inicio ?? null,
        range?.fim ?? null
      )
    ) {
      return false;
    }

    if (filters.cliente.trim()) {
      if (clienteMatch === "exact") {
        if (
          !isAgendamentoDaEmpresa(
            {
              cliente_id: item.cliente_id,
              cliente_nome: item.cliente_nome,
            },
            { nome: filters.cliente },
            catalog
          )
        ) {
          return false;
        }
      } else if (!matchesText(item.cliente_nome, filters.cliente)) {
        return false;
      }
    }

    if (filters.clinica.trim()) {
      if (clinicaMatch === "exact") {
        if (!isAgendamentoDaClinica(item.clinica_nome, filters.clinica)) {
          return false;
        }
      } else if (!matchesText(item.clinica_nome, filters.clinica)) {
        return false;
      }
    }

    if (!matchesText(item.responsavel, filters.responsavel)) return false;
    return true;
  });
}

/** Agendamentos que pertencem exatamente à empresa/clínica da fatura. */
export function filterAgendamentosDaReferenciaFatura(
  agendamentos: AgendamentoWithExames[],
  params: {
    mesReferencia: string;
    tipo: "cliente" | "clinica";
    referenciaNome: string;
    referenciaId?: string | null;
    clientesCatalog?: ClienteCatalogItem[];
  }
): AgendamentoWithExames[] {
  const filters: FaturaFilters = {
    ...EMPTY_FATURA_FILTERS,
    mesReferencia: params.mesReferencia,
    ...(params.tipo === "cliente"
      ? { cliente: params.referenciaNome }
      : { clinica: params.referenciaNome }),
  };

  if (params.tipo === "cliente") {
    return filterAgendamentosFatura(agendamentos, filters, {
      clienteMatch: "exact",
      clientesCatalog: params.clientesCatalog,
    }).filter((ag) =>
      isAgendamentoDaEmpresa(
        { cliente_id: ag.cliente_id, cliente_nome: ag.cliente_nome },
        {
          id: params.referenciaId,
          nome: params.referenciaNome,
        },
        params.clientesCatalog
      )
    );
  }

  return filterAgendamentosFatura(agendamentos, filters, {
    clinicaMatch: "exact",
  });
}

export function filterFaturasHistorico(
  faturas: FaturaRecord[],
  filters: FaturaHistoricoFilters
): FaturaRecord[] {
  return faturas.filter((fatura) => {
    if (filters.tipo && fatura.tipo !== filters.tipo) return false;
    if (!matchesText(fatura.referencia_nome, filters.referencia)) return false;
    if (
      filters.mesReferencia.trim() &&
      !faturaMatchesMesReferencia(fatura, filters.mesReferencia)
    ) {
      return false;
    }
    if (filters.status) {
      if (filters.status === "paga") {
        if (!faturaStatusEmissaoAtiva(fatura.status) || !fatura.pago) return false;
      } else if (filters.status === "pendente") {
        if (!faturaStatusEmissaoAtiva(fatura.status) || fatura.pago) return false;
      } else if (fatura.status !== filters.status) {
        return false;
      }
    }
    return true;
  });
}

export function buildLinhasFaturaCliente(
  agendamentos: AgendamentoWithExames[]
): FaturaLinhaCliente[] {
  const linhas: FaturaLinhaCliente[] = [];

  agendamentos.forEach((ag) => {
    const exames = ag.agendamento_exames ?? [];
    exames.forEach((exam) => {
      linhas.push({
        data: formatDateBR(ag.data_agendamento),
        colaborador: ag.colaborador,
        aso: ag.aso,
        clinica: ag.clinica_nome,
        exame: exam.tipo_exame,
        valorCliente: Number(exam.valor_cliente),
      });
    });
  });

  return linhas.sort((a, b) => a.data.localeCompare(b.data));
}

export function buildLinhasFaturaClinica(
  agendamentos: AgendamentoWithExames[]
): FaturaLinhaClinica[] {
  const linhas: FaturaLinhaClinica[] = [];

  agendamentos.forEach((ag) => {
    const exames = ag.agendamento_exames ?? [];
    exames.forEach((exam) => {
      linhas.push({
        data: formatDateBR(ag.data_agendamento),
        colaborador: ag.colaborador,
        cliente: ag.cliente_nome,
        aso: ag.aso,
        exame: exam.tipo_exame,
        custoClinica: Number(exam.custo_clinica),
      });
    });
  });

  return linhas.sort((a, b) => a.data.localeCompare(b.data));
}

export function extractFaturaFilterOptions(
  agendamentos: AgendamentoWithExames[]
) {
  const elegiveis = filterAgendamentosElegiveisFatura(agendamentos);
  const clinicas = new Set<string>();
  const responsaveis = new Set<string>();

  elegiveis.forEach((a) => {
    if (a.clinica_nome) clinicas.add(a.clinica_nome);
    if (a.responsavel) responsaveis.add(a.responsavel);
  });
  return {
    clinicas: Array.from(clinicas).sort(),
    responsaveis: Array.from(responsaveis).sort(),
  };
}

export function formatPeriodoFatura(mesReferencia: string): string {
  const trimmed = mesReferencia.trim();
  if (!trimmed) return "Período completo";

  const range = parseMonthYearBRToIsoRange(trimmed);
  if (!range) return trimmed;

  return `${formatDateIsoToBR(range.inicio)} a ${formatDateIsoToBR(range.fim)}`;
}
