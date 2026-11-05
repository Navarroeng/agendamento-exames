import {
  parseDateBRToIso,
  parseMonthYearBRToIsoRange,
  todayIsoSaoPaulo,
} from "@/lib/agendamento-datetime";
import type { ESocialFilters, ESocialStatusFilter } from "@/lib/esocial-filters";
import type { ESocialTableSortState } from "@/lib/esocial-table-sort";
import {
  diaSeguinteIso,
  termoIlike,
} from "@/lib/consulta-lotes";
import type {
  CondicaoConsulta,
  OrdemConsulta,
} from "@/lib/agendamento-consulta";

const URGENTE_DIAS = 30;

export function limiteUrgenciaEsocial(hojeIso = todayIsoSaoPaulo()): string {
  const [year, month, day] = hojeIso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - URGENTE_DIAS);
  return date.toISOString().slice(0, 10);
}

function texto(coluna: string, valor: string): CondicaoConsulta | null {
  const termo = termoIlike(valor);
  if (!termo) return null;
  return { op: "ilike", coluna, valor: `%${termo}%` };
}

function periodo(filters: ESocialFilters): CondicaoConsulta[] {
  const mes = filters.mesReferencia.trim();
  if (mes) {
    const range = parseMonthYearBRToIsoRange(mes);
    if (!range) return [];
    return [
      { op: "gte", coluna: "data_agendamento", valor: range.inicio },
      { op: "lt", coluna: "data_agendamento", valor: diaSeguinteIso(range.fim) },
    ];
  }

  const condicoes: CondicaoConsulta[] = [];
  const inicio = filters.dataInicio.trim()
    ? parseDateBRToIso(filters.dataInicio)
    : null;
  const fim = filters.dataFim.trim() ? parseDateBRToIso(filters.dataFim) : null;
  if (inicio) {
    condicoes.push({ op: "gte", coluna: "data_agendamento", valor: inicio });
  }
  if (fim) {
    condicoes.push({
      op: "lt",
      coluna: "data_agendamento",
      valor: diaSeguinteIso(fim),
    });
  }
  return condicoes;
}

function naoEnviado(): CondicaoConsulta {
  return { op: "notEq", coluna: "envio_esocial", valor: true };
}

function naoCanceladoEnvio(): CondicaoConsulta {
  return { op: "notEq", coluna: "esocial_envio_cancelado", valor: true };
}

export function condicoesStatusEsocial(
  status: ESocialStatusFilter,
  hojeIso = todayIsoSaoPaulo()
): CondicaoConsulta[] {
  const corte = limiteUrgenciaEsocial(hojeIso);
  switch (status) {
    case "cancelado":
      return [{ op: "eq", coluna: "esocial_envio_cancelado", valor: true }];
    case "enviado":
      return [
        naoCanceladoEnvio(),
        { op: "eq", coluna: "envio_esocial", valor: true },
      ];
    case "urgente":
      return [
        naoCanceladoEnvio(),
        naoEnviado(),
        { op: "lt", coluna: "data_agendamento", valor: corte },
      ];
    case "pendente":
      return [
        naoCanceladoEnvio(),
        naoEnviado(),
        { op: "gte", coluna: "data_agendamento", valor: corte },
      ];
    case "acao":
      return [naoCanceladoEnvio(), naoEnviado()];
    case "todos":
      return [];
    default:
      return [];
  }
}

function ordem(sort: ESocialTableSortState | null): OrdemConsulta[] {
  const id: OrdemConsulta = { coluna: "id", ascending: true };
  if (!sort) {
    return [
      { coluna: "data_agendamento", ascending: true },
      { coluna: "horario", ascending: true },
      id,
    ];
  }
  const ascending = sort.direction === "asc";
  switch (sort.column) {
    case "dataExame":
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
    case "dataEnvioEsocial":
      return [{ coluna: "data_envio_esocial", ascending }, id];
    case "statusEsocial":
      return [
        { coluna: "esocial_envio_cancelado", ascending },
        { coluna: "envio_esocial", ascending },
        { coluna: "data_agendamento", ascending },
        id,
      ];
    default:
      return [id];
  }
}

export interface ConsultaEsocial {
  condicoes: CondicaoConsulta[];
  ordem: OrdemConsulta[];
}

/** A listagem de e-Social nunca inclui agendamento cancelado. */
export function consultaEsocial(
  filters: ESocialFilters,
  sort: ESocialTableSortState | null,
  hojeIso = todayIsoSaoPaulo()
): ConsultaEsocial {
  const condicoes: CondicaoConsulta[] = [
    { op: "neq", coluna: "status", valor: "cancelado" },
    ...periodo(filters),
    ...condicoesStatusEsocial(filters.statusEsocial, hojeIso),
  ];
  for (const condicao of [
    texto("cliente_nome", filters.cliente),
    texto("colaborador", filters.colaborador),
  ]) {
    if (condicao) condicoes.push(condicao);
  }
  return { condicoes, ordem: ordem(sort) };
}

export function consultaResumoEsocial(
  filters: ESocialFilters,
  hojeIso = todayIsoSaoPaulo()
): ConsultaEsocial {
  return consultaEsocial(
    { ...filters, statusEsocial: "todos" },
    null,
    hojeIso
  );
}
