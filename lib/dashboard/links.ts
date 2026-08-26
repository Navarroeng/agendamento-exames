import { formatDateIsoToBR } from "@/lib/agendamento-datetime";
import { PENDENCIA_LABELS } from "@/lib/agendamentos-table";
import {
  addCalendarDaysIso,
  getDashboardMonthBounds,
  type DashboardNow,
} from "./month-bounds";
import type { DashboardCardHrefs } from "./types";

function withQuery(path: string, params: Record<string, string>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * URLs dos cards usando apenas campos de filtro já existentes nas páginas.
 * Não inventa parâmetros novos.
 */
export function buildDashboardCardHrefs(
  now: DashboardNow = new Date()
): DashboardCardHrefs {
  const bounds = getDashboardMonthBounds(now);
  const ultimoDiaMesAnterior = addCalendarDaysIso(bounds.inicioMesAtual, -1);
  const [anoAtual, mesAtual] = bounds.inicioMesAtual.split("-");

  return {
    esocial: withQuery("/e-social", {
      statusEsocial: "acao",
      dataFim: formatDateIsoToBR(ultimoDiaMesAnterior),
      mesReferencia: "",
    }),
    asosClinica: withQuery("/", {
      pendencia: PENDENCIA_LABELS[1],
      pendenciaSituacao: "pendente",
      mesReferencia: "",
    }),
    asosCliente: withQuery("/", {
      pendencia: PENDENCIA_LABELS[2],
      pendenciaSituacao: "pendente",
      mesReferencia: "",
    }),
    periodicosVencidos: withQuery("/periodicos-futuros", {
      status: "vencido",
    }),
    periodicosMesAtual: withQuery("/periodicos-futuros", {
      ano: anoAtual,
      mes: String(Number(mesAtual)),
    }),
    agendamentosHoje: "/",
  };
}
