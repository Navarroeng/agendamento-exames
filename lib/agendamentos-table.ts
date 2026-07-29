import { isEnvioEsocialConcluido } from "@/lib/esocial-filters";
import { formatDateBR } from "@/lib/format";
import { formatCurrency } from "@/lib/money";
import type {
  AgendamentoExameRecord,
  AgendamentoTableRow,
  PendenciaBadge,
  AgendamentoWithExames,
} from "@/lib/types";

function statusAgendamento(
  status: string
): Pick<AgendamentoTableRow, "statusType" | "statusLabel"> {
  if (status === "rascunho") {
    return { statusType: "draft", statusLabel: "Rascunho" };
  }
  if (status === "cancelado") {
    return { statusType: "cancelled", statusLabel: "Cancelado" };
  }
  if (status === "agendado") {
    return { statusType: "active", statusLabel: "Agendado" };
  }
  if (status === "aso_retido") {
    return { statusType: "asoRetido", statusLabel: "ASO Retido" };
  }
  return { statusType: "pending", statusLabel: "Pendente" };
}

export function statusAgendamentoLabel(status: string): string {
  return statusAgendamento(status).statusLabel;
}

function formatExamesResumo(exames: AgendamentoExameRecord[]): string {
  if (exames.length === 0) return "—";
  const first = exames[0].tipo_exame;
  if (exames.length === 1) return first;
  const extra = exames.length - 1;
  return `${first} + ${extra} exame${extra > 1 ? "s" : ""}`;
}

function buildPendencia(
  label: string,
  concluido: boolean,
  data: string | null | undefined
): PendenciaBadge {
  if (concluido) {
    const texto = data ? formatDateBR(data) : "Sim";
    return { label, status: "done", text: texto };
  }
  return { label, status: "pending", text: "Pendente" };
}

export const PENDENCIA_LABELS = [
  "ASO Clínica",
  "ASO Assinado",
  "ASO Cliente",
] as const;

export function buildPendencias(
  agendamento: AgendamentoWithExames
): PendenciaBadge[] {
  return [
    buildPendencia(
      "ASO Clínica",
      agendamento.aso_enviado_clinica,
      agendamento.data_aso_enviado_clinica
    ),
    buildPendencia(
      "ASO Assinado",
      agendamento.aso_assinado,
      agendamento.data_aso_assinado
    ),
    buildPendencia(
      "ASO Cliente",
      agendamento.aso_enviado_cliente,
      agendamento.data_aso_enviado_cliente
    ),
    buildPendencia(
      "e-Social",
      agendamento.envio_esocial,
      agendamento.data_envio_esocial
    ),
  ];
}

function calcTotalCliente(exames: AgendamentoExameRecord[]): number {
  return exames.reduce((sum, exam) => sum + Number(exam.valor_cliente), 0);
}

export function mapAgendamentosToTableRows(
  agendamentos: AgendamentoWithExames[]
): AgendamentoTableRow[] {
  return agendamentos.map((agendamento) => {
    const exames = agendamento.agendamento_exames ?? [];
    const totalCliente = calcTotalCliente(exames);
    const { statusType, statusLabel } = statusAgendamento(agendamento.status);

    return {
      key: agendamento.id,
      agendamentoId: agendamento.id,
      dataAgendada: formatDateBR(agendamento.data_agendamento),
      cliente: agendamento.cliente_nome,
      colaborador: agendamento.colaborador,
      aso: agendamento.aso,
      examesResumo: formatExamesResumo(exames),
      totalCliente:
        exames.length > 0 ? formatCurrency(totalCliente) : "—",
      statusType,
      statusLabel,
      agendamentoStatus: agendamento.status as AgendamentoTableRow["agendamentoStatus"],
      asoClinica: agendamento.aso_enviado_clinica,
      asoAssinado: agendamento.aso_assinado,
      asoCliente: agendamento.aso_enviado_cliente,
      matricula: agendamento.numero_matricula?.trim() || "—",
      esocial: isEnvioEsocialConcluido(agendamento.envio_esocial),
    };
  });
}
