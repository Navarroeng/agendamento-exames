import {
  hasActiveFilters,
  isAgendamentoStatusFiltroTodos,
  type AgendamentoFilters,
} from "@/lib/agendamento-filters";
import { parseMonthYearBRToIsoRange } from "@/lib/agendamento-datetime";
import type { AgendamentoTableSortState } from "@/lib/agendamento-table-sort";
import { PENDENCIA_LABELS } from "@/lib/agendamentos-table";
import { diaSeguinteIso, termoIlike } from "@/lib/consulta-lotes";

export type CondicaoConsulta =
  | {
      op: "gte" | "lt" | "ilike" | "eq" | "neq";
      coluna: string;
      valor: string | boolean;
    }
  | { op: "in"; coluna: string; valor: string[] }
  | { op: "or"; valor: string }
  | { op: "notEq"; coluna: string; valor: string | boolean };

export interface OrdemConsulta {
  coluna: string;
  ascending: boolean;
}

export interface ConsultaAgendamentos {
  condicoes: CondicaoConsulta[];
  ordem: OrdemConsulta[];
  /** Quando preenchido, só entram agendamentos com exame cujo nome casa. */
  tipoExame: string | null;
}

const PENDENCIA_COLUNA: Record<(typeof PENDENCIA_LABELS)[number], string> = {
  "ASO Clínica": "aso_enviado_clinica",
  "ASO Assinado": "aso_assinado",
  "ASO Cliente": "aso_enviado_cliente",
};

function pendente(coluna: string): CondicaoConsulta {
  return { op: "or", valor: `${coluna}.is.null,${coluna}.eq.false` };
}

function concluida(coluna: string): CondicaoConsulta {
  return { op: "eq", coluna, valor: true };
}

function condicoesPendencia(filters: AgendamentoFilters): CondicaoConsulta[] {
  const tipo = filters.pendencia.trim();
  const situacao = filters.pendenciaSituacao.trim();
  if (!tipo && !situacao) return [];

  if (!tipo && situacao === "pendente") {
    const partes = [
      ...PENDENCIA_LABELS.map((label) => PENDENCIA_COLUNA[label]),
      "envio_esocial",
    ].map((coluna) => `${coluna}.is.null,${coluna}.eq.false`);
    return [{ op: "or", valor: partes.join(",") }];
  }

  if (!tipo && situacao === "concluida") {
    return [
      ...PENDENCIA_LABELS.map((label) => concluida(PENDENCIA_COLUNA[label])),
      concluida("envio_esocial"),
    ];
  }

  const coluna = PENDENCIA_COLUNA[tipo as (typeof PENDENCIA_LABELS)[number]];
  if (!coluna) return [];
  const efetiva = situacao || "pendente";
  if (efetiva === "concluida") return [concluida(coluna)];
  return [pendente(coluna)];
}

function condicoesEsocial(filters: AgendamentoFilters): CondicaoConsulta[] {
  const sit = filters.esocial.trim();
  if (sit === "pendente") return [pendente("envio_esocial")];
  if (sit === "concluida") return [concluida("envio_esocial")];
  return [];
}

function ordemPadrao(filters: AgendamentoFilters): OrdemConsulta[] {
  if (!hasActiveFilters(filters)) {
    return [
      { coluna: "created_at", ascending: false },
      { coluna: "id", ascending: false },
    ];
  }
  return [
    { coluna: "data_agendamento", ascending: true },
    { coluna: "horario", ascending: true },
    { coluna: "id", ascending: true },
  ];
}

function ordemDoUsuario(sort: AgendamentoTableSortState): OrdemConsulta[] {
  const ascending = sort.direction === "asc";
  const id: OrdemConsulta = { coluna: "id", ascending: true };
  switch (sort.column) {
    case "dataAgendada":
      return [
        { coluna: "data_agendamento", ascending },
        { coluna: "horario", ascending },
        id,
      ];
    case "cliente":
      return [{ coluna: "cliente_nome", ascending }, id];
    case "colaborador":
      return [{ coluna: "colaborador", ascending }, id];
    case "aso":
      return [{ coluna: "aso", ascending }, id];
    case "status":
      return [{ coluna: "status", ascending }, id];
    case "asoClinica":
      return [{ coluna: "aso_enviado_clinica", ascending }, id];
    case "asoAssinado":
      return [{ coluna: "aso_assinado", ascending }, id];
    case "asoCliente":
      return [{ coluna: "aso_enviado_cliente", ascending }, id];
    case "matricula":
      return [{ coluna: "numero_matricula", ascending }, id];
    case "esocial":
      return [{ coluna: "envio_esocial", ascending }, id];
    case "exames":
    case "totalCliente":
      return [
        { coluna: "data_agendamento", ascending: true },
        { coluna: "horario", ascending: true },
        id,
      ];
    default:
      return [id];
  }
}

function texto(
  coluna: string,
  valor: string
): CondicaoConsulta | null {
  const termo = termoIlike(valor);
  if (!termo) return null;
  return { op: "ilike", coluna, valor: `%${termo}%` };
}

/**
 * Filtros da tela de Agendamentos, aplicados antes da paginação.
 * Mês vazio não restringe data. Status vazio significa todos, inclusive cancelado.
 */
export function consultaAgendamentos(
  filters: AgendamentoFilters,
  sort: AgendamentoTableSortState | null
): ConsultaAgendamentos {
  const condicoes: CondicaoConsulta[] = [];
  const mes = filters.mesReferencia.trim();
  const range = mes ? parseMonthYearBRToIsoRange(mes) : null;
  if (range) {
    condicoes.push({ op: "gte", coluna: "data_agendamento", valor: range.inicio });
    condicoes.push({
      op: "lt",
      coluna: "data_agendamento",
      valor: diaSeguinteIso(range.fim),
    });
  }

  if (!isAgendamentoStatusFiltroTodos(filters.status)) {
    condicoes.push({ op: "in", coluna: "status", valor: [...filters.status] });
  }

  for (const condicao of [
    texto("cliente_nome", filters.cliente),
    texto("colaborador", filters.colaborador),
    texto("clinica_nome", filters.clinica),
    texto("aso", filters.aso),
    texto("responsavel", filters.responsavel),
  ]) {
    if (condicao) condicoes.push(condicao);
  }

  condicoes.push(...condicoesPendencia(filters), ...condicoesEsocial(filters));

  return {
    condicoes,
    ordem: sort ? ordemDoUsuario(sort) : ordemPadrao(filters),
    tipoExame: termoIlike(filters.tipoExame),
  };
}
