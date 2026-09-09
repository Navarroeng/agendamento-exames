/**
 * Portal do Cliente — módulo Agendamentos (somente consulta).
 * Reutiliza status e isolamento já existentes; sem custos/PII.
 */

import { formatDateIsoToBR, todayIsoSaoPaulo } from "@/lib/agendamento-datetime";
import { statusAgendamentoLabel } from "@/lib/agendamentos-table";
import { isAgendamentoCancelado } from "@/lib/contrato-agendamentos";
import { agendamentoPertenceAoClienteContrato } from "@/lib/contrato-agendamentos";
import { formatHorarioDisplay } from "@/lib/format-datetime";
import type { AgendamentoStatus, AgendamentoWithExames } from "@/lib/types";

/** Status visíveis ao cliente (exclui cancelado e rascunho interno). */
export const PORTAL_AGENDAMENTO_STATUS_INCLUIDOS: AgendamentoStatus[] = [
  "agendado",
  "aso_retido",
];

export type PortalAgendamentoStatusVisivel = "agendado" | "aso_retido";

export type PortalAgendamentosFiltro =
  | "todos"
  | "proximos"
  | "historico";

export type PortalAgendamentoLinha = {
  id: string;
  dataIso: string;
  dataLabel: string;
  horarioLabel: string;
  colaborador: string;
  clinicaNome: string;
  tipoAso: string;
  status: PortalAgendamentoStatusVisivel;
  statusLabel: string;
  isFuturoOuHoje: boolean;
};

export type PortalAgendamentoExame = {
  id: string;
  nome: string;
};

export type PortalAgendamentoDetalhe = PortalAgendamentoLinha & {
  exames: PortalAgendamentoExame[];
  enderecoClinica: string | null;
};

export type PortalAgendamentosResumo = {
  total: number;
  totalProximos: number;
  totalHistorico: number;
  temAgendamentos: boolean;
  proximoDataLabel: string | null;
  proximoHorarioLabel: string | null;
  proximoLabel: string | null;
};

export function isAgendamentoPortalVisivel(
  status: AgendamentoStatus | string | null | undefined
): boolean {
  if (isAgendamentoCancelado(status)) return false;
  const key = String(status ?? "").trim().toLowerCase();
  return key === "agendado" || key === "aso_retido";
}

export function agendamentoPertenceAoClientePortal(
  agendamento: {
    cliente_id?: string | null;
    cliente_nome?: string | null;
  },
  clienteId: string,
  clienteNome: string
): boolean {
  return agendamentoPertenceAoClienteContrato(agendamento, {
    id: clienteId,
    nome: clienteNome,
  });
}

function toDataIso(data: string | null | undefined): string {
  return String(data ?? "").slice(0, 10);
}

function horarioLabel(horario: string | null | undefined): string {
  const raw = (horario ?? "").trim();
  if (!raw) return "—";
  return formatHorarioDisplay(raw).slice(0, 5) || raw;
}

export function agendamentoToPortalLinha(
  agendamento: Pick<
    AgendamentoWithExames,
    | "id"
    | "data_agendamento"
    | "horario"
    | "colaborador"
    | "clinica_nome"
    | "aso"
    | "status"
  >,
  hojeIso: string = todayIsoSaoPaulo()
): PortalAgendamentoLinha | null {
  if (!isAgendamentoPortalVisivel(agendamento.status)) return null;
  const dataIso = toDataIso(agendamento.data_agendamento);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return null;
  const status = agendamento.status as PortalAgendamentoStatusVisivel;
  return {
    id: agendamento.id,
    dataIso,
    dataLabel: formatDateIsoToBR(dataIso),
    horarioLabel: horarioLabel(agendamento.horario),
    colaborador: (agendamento.colaborador ?? "").trim() || "—",
    clinicaNome: (agendamento.clinica_nome ?? "").trim() || "—",
    tipoAso: (agendamento.aso ?? "").trim() || "—",
    status,
    statusLabel: statusAgendamentoLabel(status),
    isFuturoOuHoje: dataIso >= hojeIso,
  };
}

export function agendamentoToPortalDetalhe(
  agendamento: AgendamentoWithExames,
  opts?: {
    hojeIso?: string;
    enderecoClinica?: string | null;
  }
): PortalAgendamentoDetalhe | null {
  const linha = agendamentoToPortalLinha(agendamento, opts?.hojeIso);
  if (!linha) return null;
  const exames = (agendamento.agendamento_exames ?? [])
    .map((ex) => ({
      id: String(ex.id ?? ""),
      nome: String(ex.tipo_exame ?? "").trim(),
    }))
    .filter((ex) => ex.id && ex.nome);
  return {
    ...linha,
    exames,
    enderecoClinica: (opts?.enderecoClinica ?? "").trim() || null,
  };
}

export function splitPortalAgendamentos(
  linhas: PortalAgendamentoLinha[]
): {
  proximos: PortalAgendamentoLinha[];
  historico: PortalAgendamentoLinha[];
} {
  const proximos = linhas
    .filter((l) => l.isFuturoOuHoje)
    .slice()
    .sort((a, b) => {
      const d = a.dataIso.localeCompare(b.dataIso);
      if (d !== 0) return d;
      return a.horarioLabel.localeCompare(b.horarioLabel);
    });
  const historico = linhas
    .filter((l) => !l.isFuturoOuHoje)
    .slice()
    .sort((a, b) => {
      const d = b.dataIso.localeCompare(a.dataIso);
      if (d !== 0) return d;
      return b.horarioLabel.localeCompare(a.horarioLabel);
    });
  return { proximos, historico };
}

export function calcPortalAgendamentosResumo(
  linhas: PortalAgendamentoLinha[]
): PortalAgendamentosResumo {
  const { proximos, historico } = splitPortalAgendamentos(linhas);
  const proximo = proximos[0] ?? null;
  let proximoLabel: string | null = null;
  if (proximo) {
    proximoLabel =
      proximo.horarioLabel && proximo.horarioLabel !== "—"
        ? `Próximo: ${proximo.dataLabel} às ${proximo.horarioLabel}`
        : `Próximo: ${proximo.dataLabel}`;
  } else if (historico.length > 0) {
    proximoLabel = "Nenhum agendamento futuro";
  }

  return {
    total: linhas.length,
    totalProximos: proximos.length,
    totalHistorico: historico.length,
    temAgendamentos: linhas.length > 0,
    proximoDataLabel: proximo?.dataLabel ?? null,
    proximoHorarioLabel:
      proximo && proximo.horarioLabel !== "—" ? proximo.horarioLabel : null,
    proximoLabel,
  };
}

export function filtrarPortalAgendamentos(
  linhas: PortalAgendamentoLinha[],
  opts: {
    filtro: PortalAgendamentosFiltro;
    buscaColaborador?: string;
  }
): PortalAgendamentoLinha[] {
  const { proximos, historico } = splitPortalAgendamentos(linhas);
  let base =
    opts.filtro === "proximos"
      ? proximos
      : opts.filtro === "historico"
        ? historico
        : [...proximos, ...historico];

  const q = (opts.buscaColaborador ?? "").trim().toLocaleLowerCase("pt-BR");
  if (q) {
    base = base.filter((l) =>
      l.colaborador.toLocaleLowerCase("pt-BR").includes(q)
    );
  }
  return base;
}

export function linhasResumoAgendamentosHome(
  resumo: PortalAgendamentosResumo
): string[] {
  if (!resumo.temAgendamentos) {
    return ["Nenhum agendamento disponível no momento"];
  }
  const linhas: string[] = [];
  if (resumo.totalProximos > 0) {
    linhas.push(
      `${resumo.totalProximos} próximo${resumo.totalProximos !== 1 ? "s" : ""} agendamento${resumo.totalProximos !== 1 ? "s" : ""}`
    );
  } else {
    linhas.push("Nenhum agendamento futuro");
  }
  if (resumo.proximoDataLabel) {
    linhas.push(
      resumo.proximoHorarioLabel
        ? `Próximo: ${resumo.proximoDataLabel} às ${resumo.proximoHorarioLabel}`
        : `Próximo: ${resumo.proximoDataLabel}`
    );
  }
  return linhas;
}
