import type { OrcamentoAprovacaoRecord } from "@/lib/orcamento-aprovacao";
import {
  copyLaudoPontual,
  type LaudoPontualKind,
} from "@/lib/servico-laudo-pontual";

export type ImplantacaoAetVisitaStatus =
  | "aguardando_agendamento"
  | "agendada"
  | "realizada";

export type ImplantacaoAetElaboracaoStatus =
  | "aguardando"
  | "em_elaboracao"
  | "concluido";

export const IMPLANTACAO_AET_VISITA_STATUS_LABELS: Record<
  ImplantacaoAetVisitaStatus,
  string
> = {
  aguardando_agendamento: "Aguardando agendamento",
  agendada: "Agendada",
  realizada: "Realizada",
};

export const IMPLANTACAO_AET_ELABORACAO_STATUS_LABELS: Record<
  ImplantacaoAetElaboracaoStatus,
  string
> = {
  aguardando: "Aguardando",
  em_elaboracao: "Em elaboração",
  concluido: "Concluído",
};

export interface ImplantacaoAetRecord {
  id: string;
  orcamento_id: string;
  aprovacao_id: string;
  /** Legado da migration 123; fora do fluxo operacional do AET. */
  documentos_conferidos: boolean;
  documentos_conferidos_em: string | null;
  documentos_conferidos_por: string | null;
  visita_status: ImplantacaoAetVisitaStatus;
  visita_data: string | null;
  visita_horario: string | null;
  visita_responsavel: string | null;
  visita_observacao: string | null;
  visita_realizada_em: string | null;
  elaboracao_status: ImplantacaoAetElaboracaoStatus;
  elaboracao_observacao: string | null;
  elaboracao_concluida_em: string | null;
  laudo_path: string | null;
  laudo_nome: string | null;
  laudo_tipo: string | null;
  laudo_tamanho: number | null;
  enviado_cliente: boolean;
  enviado_em: string | null;
  envio_observacao: string | null;
  criado_em?: string | null;
  criado_por?: string | null;
  atualizado_em?: string | null;
  atualizado_por?: string | null;
}

export interface ImplantacaoAetDocumentoRecord {
  id: string;
  aet_id: string;
  storage_path: string;
  arquivo_nome: string;
  arquivo_tipo: string | null;
  arquivo_tamanho: number | null;
  enviado_em: string;
  enviado_por: string | null;
  enviado_por_user_id: string | null;
}

export type ImplantacaoAetVisitaPayload = {
  visita_status: ImplantacaoAetVisitaStatus;
  visita_data: string | null;
  visita_horario: string | null;
  visita_responsavel: string | null;
  visita_observacao: string | null;
};

export type ImplantacaoAetElaboracaoPayload = {
  elaboracao_status: ImplantacaoAetElaboracaoStatus;
  elaboracao_observacao: string | null;
};

export type ImplantacaoAetEnvioPayload = {
  enviado_cliente: boolean;
  enviado_em: string | null;
  envio_observacao: string | null;
};

export function isAetVisitaRealizada(
  aet: Pick<ImplantacaoAetRecord, "visita_status"> | null | undefined
): boolean {
  return aet?.visita_status === "realizada";
}

export function isAetElaboracaoConcluida(
  aet:
    | Pick<
        ImplantacaoAetRecord,
        "elaboracao_status" | "laudo_path"
      >
    | null
    | undefined
): boolean {
  return (
    aet?.elaboracao_status === "concluido" && Boolean(aet.laudo_path?.trim())
  );
}

export function isAetEnvioConcluido(
  aet: Pick<ImplantacaoAetRecord, "enviado_cliente" | "enviado_em"> | null | undefined
): boolean {
  return Boolean(aet?.enviado_cliente) && Boolean(aet?.enviado_em);
}

/**
 * Conclusão operacional do AET (envio ao cliente).
 * Independente do pagamento: débito em aberto continua em
 * `isOrcamentoPagamentoPendente` / etapa Financeiro.
 */
export function isImplantacaoAetConcluida(
  aprovacao: OrcamentoAprovacaoRecord | null,
  aet: ImplantacaoAetRecord | null | undefined,
  contratoOk: boolean
): boolean {
  return (
    Boolean(aprovacao) &&
    contratoOk &&
    isAetVisitaRealizada(aet) &&
    isAetElaboracaoConcluida(aet) &&
    isAetEnvioConcluido(aet)
  );
}

export function validateAetVisitaPayload(
  payload: ImplantacaoAetVisitaPayload
): string | null {
  if (payload.visita_status === "aguardando_agendamento") return null;
  if (!payload.visita_data) return "Informe a data da visita.";
  if (payload.visita_status === "agendada" && !payload.visita_horario?.trim()) {
    return "Informe o horário da visita.";
  }
  if (payload.visita_status === "realizada" && !payload.visita_data) {
    return "Informe a data da visita realizada.";
  }
  return null;
}

export function validateAetElaboracaoPayload(
  payload: ImplantacaoAetElaboracaoPayload,
  aet: ImplantacaoAetRecord | null,
  kind: LaudoPontualKind = "aet"
): string | null {
  if (!isAetVisitaRealizada(aet)) {
    if (payload.elaboracao_status !== "aguardando") {
      return "Aguardando realização da visita";
    }
    return null;
  }
  if (payload.elaboracao_status === "concluido" && !aet?.laudo_path?.trim()) {
    return copyLaudoPontual(kind).anexeAntesDeConcluir;
  }
  return null;
}

export function validateAetEnvioPayload(
  payload: ImplantacaoAetEnvioPayload,
  aet: ImplantacaoAetRecord | null,
  kind: LaudoPontualKind = "aet"
): string | null {
  if (payload.enviado_cliente) {
    if (!isAetElaboracaoConcluida(aet)) {
      return copyLaudoPontual(kind).concluaAntesEnvio;
    }
    if (!payload.enviado_em) {
      return "Informe a data de envio ao cliente.";
    }
  }
  return null;
}
