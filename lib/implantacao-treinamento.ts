import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";

export type ImplantacaoTreinamentoStatus =
  | "a_definir"
  | "agendado"
  | "confirmado"
  | "realizado"
  | "cancelado"
  | "reagendado";

export type ImplantacaoTreinamentoModalidade =
  | "presencial"
  | "online"
  | "hibrido";

export type ImplantacaoTreinamentoEventoTipo =
  | "criacao"
  | "edicao"
  | "confirmacao"
  | "reagendamento"
  | "realizacao"
  | "cancelamento";

export const IMPLANTACAO_TREINAMENTO_STATUS_LABELS: Record<
  ImplantacaoTreinamentoStatus,
  string
> = {
  a_definir: "A definir",
  agendado: "Agendado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  reagendado: "Reagendado",
};

export const IMPLANTACAO_TREINAMENTO_MODALIDADE_LABELS: Record<
  ImplantacaoTreinamentoModalidade,
  string
> = {
  presencial: "Presencial",
  online: "Online",
  hibrido: "Híbrido",
};

export const IMPLANTACAO_TREINAMENTO_STATUS_OPTIONS: ImplantacaoTreinamentoStatus[] =
  [
    "a_definir",
    "agendado",
    "confirmado",
    "realizado",
    "cancelado",
    "reagendado",
  ];

/** Status que concluem a etapa de agendamento (e liberam conclusão da implantação). */
export const IMPLANTACAO_TREINAMENTO_STATUS_ETAPA_OK: ImplantacaoTreinamentoStatus[] =
  ["agendado", "confirmado", "realizado", "reagendado"];

export interface ImplantacaoTreinamentoRecord {
  id: string;
  orcamento_id: string;
  aprovacao_id: string;
  data_treinamento: string | null;
  horario_inicio: string | null;
  horario_termino: string | null;
  modalidade: ImplantacaoTreinamentoModalidade | null;
  local_treinamento: string | null;
  endereco: string | null;
  link_reuniao: string | null;
  tipo_nome: string | null;
  quantidade_participantes: number | null;
  instrutor_responsavel: string | null;
  contato_empresa: string | null;
  observacoes: string | null;
  status: ImplantacaoTreinamentoStatus;
  motivo_cancelamento: string | null;
  motivo_reagendamento: string | null;
  data_anterior: string | null;
  horario_inicio_anterior: string | null;
  horario_termino_anterior: string | null;
  criado_em?: string | null;
  criado_por?: string | null;
  atualizado_em?: string | null;
  atualizado_por?: string | null;
}

export interface ImplantacaoTreinamentoEventoRecord {
  id: string;
  treinamento_id: string;
  tipo_evento: ImplantacaoTreinamentoEventoTipo;
  status_anterior: string | null;
  status_novo: string | null;
  data_anterior: string | null;
  data_nova: string | null;
  horario_inicio_anterior: string | null;
  horario_inicio_novo: string | null;
  motivo: string | null;
  usuario_nome: string;
  criado_em: string;
}

export type ImplantacaoTreinamentoSavePayload = {
  data_treinamento: string | null;
  horario_inicio: string | null;
  horario_termino: string | null;
  modalidade: ImplantacaoTreinamentoModalidade | null;
  local_treinamento: string | null;
  endereco: string | null;
  link_reuniao: string | null;
  tipo_nome: string | null;
  quantidade_participantes: number | null;
  instrutor_responsavel: string | null;
  contato_empresa: string | null;
  observacoes: string | null;
  status: ImplantacaoTreinamentoStatus;
  motivo_cancelamento?: string | null;
  motivo_reagendamento?: string | null;
};

export function isTreinamentoEtapaConcluida(
  treino: Pick<ImplantacaoTreinamentoRecord, "status"> | null | undefined
): boolean {
  if (!treino) return false;
  return IMPLANTACAO_TREINAMENTO_STATUS_ETAPA_OK.includes(treino.status);
}

export function isTreinamentoCancelado(
  treino: Pick<ImplantacaoTreinamentoRecord, "status"> | null | undefined
): boolean {
  return treino?.status === "cancelado";
}

export function validateTreinamentoPayload(
  payload: ImplantacaoTreinamentoSavePayload
): string | null {
  if (!payload.status) return "Informe o status do treinamento.";
  if (payload.status === "a_definir") return null;

  if (!payload.data_treinamento) {
    return "Informe a data do treinamento.";
  }
  if (!payload.horario_inicio?.trim()) {
    return "Informe o horário de início.";
  }
  if (!payload.modalidade) {
    return "Informe a modalidade.";
  }
  if (!payload.tipo_nome?.trim()) {
    return "Informe o tipo/nome do treinamento.";
  }

  if (payload.modalidade === "presencial" || payload.modalidade === "hibrido") {
    if (!payload.local_treinamento?.trim() && !payload.endereco?.trim()) {
      return "Informe o local ou endereço do treinamento.";
    }
  }
  if (payload.modalidade === "online" || payload.modalidade === "hibrido") {
    if (!payload.link_reuniao?.trim()) {
      return "Informe o link da reunião.";
    }
  }
  if (payload.status === "cancelado" && !payload.motivo_cancelamento?.trim()) {
    return "Informe o motivo do cancelamento.";
  }
  if (
    payload.status === "reagendado" &&
    !payload.motivo_reagendamento?.trim()
  ) {
    return "Informe o motivo do reagendamento.";
  }
  return null;
}

export function buildMensagemConfirmacaoTreinamento(params: {
  empresa: string;
  treino: ImplantacaoTreinamentoSavePayload | ImplantacaoTreinamentoRecord;
}): string {
  const t = params.treino;
  const modalidade = t.modalidade
    ? IMPLANTACAO_TREINAMENTO_MODALIDADE_LABELS[t.modalidade]
    : "—";
  const localLinhas: string[] = [];
  if (t.modalidade === "presencial" || t.modalidade === "hibrido") {
    if (t.local_treinamento?.trim()) {
      localLinhas.push(`Local: ${t.local_treinamento.trim()}`);
    }
    if (t.endereco?.trim()) {
      localLinhas.push(`Endereço: ${t.endereco.trim()}`);
    }
  }
  if (t.modalidade === "online" || t.modalidade === "hibrido") {
    if (t.link_reuniao?.trim()) {
      localLinhas.push(`Link: ${t.link_reuniao.trim()}`);
    }
  }

  const horario =
    t.horario_termino?.trim()
      ? `${t.horario_inicio ?? "—"} às ${t.horario_termino}`
      : (t.horario_inicio ?? "—");

  return [
    "*Confirmação de Treinamento*",
    "",
    `Empresa: ${params.empresa || "—"}`,
    `Treinamento: ${t.tipo_nome?.trim() || "—"}`,
    `Data: ${t.data_treinamento || "—"}`,
    `Horário: ${horario}`,
    `Modalidade: ${modalidade}`,
    ...localLinhas,
    `Instrutor responsável: ${t.instrutor_responsavel?.trim() || "—"}`,
    "",
    "Observações importantes:",
    t.observacoes?.trim() || "—",
  ].join("\n");
}

/** Compat: aprovação pode trazer treinamento já carregado. */
export type OrcamentoAprovacaoComTreinamento = OrcamentoAprovacaoRecord & {
  treinamento?: ImplantacaoTreinamentoRecord | null;
};
