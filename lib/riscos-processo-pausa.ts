/**
 * Pausa administrativa do processo de Riscos Psicossociais (listagem).
 * Não altera status operacional (em_andamento), etapas, campanha nem COPSOQ.
 * Controle interno: o cliente não está dispensado de obrigações de SST.
 */
import { isPesquisaEfetivamenteAberta } from "@/lib/riscos-campanha";

export const RISCOS_PAUSA_SITUACOES = [
  "sem_retorno",
  "adiado_cliente",
] as const;

export type RiscosPausaSituacao = (typeof RISCOS_PAUSA_SITUACOES)[number];

export const RISCOS_PAUSA_SITUACAO_LABELS: Record<RiscosPausaSituacao, string> =
  {
    sem_retorno: "Sem retorno",
    adiado_cliente: "Adiado pelo cliente",
  };

export const RISCOS_PAUSA_ACAO_LABELS: Record<RiscosPausaSituacao, string> = {
  sem_retorno: "Marcar como sem retorno",
  adiado_cliente: "Adiar a pedido do cliente",
};

export const MSG_PROCESSO_RISCOS_PAUSADO =
  "Este processo está pausado. Retome o processo para continuar o fluxo.";

export const MSG_PROCESSO_RISCOS_JA_PAUSADO =
  "Este processo já está pausado. Retome-o para continuar.";

export const MSG_PROCESSO_RISCOS_NAO_PAUSADO =
  "Este processo não está pausado.";

export const MSG_PAUSA_PESQUISA_JA_ABERTA =
  "Não é possível pausar depois que a pesquisa foi aberta aos participantes.";

export const MSG_PAUSA_CONTROLE_ADMINISTRATIVO =
  "Controle administrativo. Não significa que a avaliação dos riscos psicossociais foi realizada nem que o cliente está dispensado de suas obrigações de SST.";

const OBSERVACAO_MAX = 2000;

export function isRiscosPausaSituacao(
  value: string | null | undefined
): value is RiscosPausaSituacao {
  return (
    value === "sem_retorno" || value === "adiado_cliente"
  );
}

export function labelPausaSituacaoRiscos(
  situacao: string | null | undefined
): string {
  if (isRiscosPausaSituacao(situacao)) {
    return RISCOS_PAUSA_SITUACAO_LABELS[situacao];
  }
  return "";
}

export function isPausaAdministrativaAtiva(
  situacao: string | null | undefined
): situacao is RiscosPausaSituacao {
  return isRiscosPausaSituacao(situacao);
}

export type RiscosProcessoPausa = {
  pausaSituacao: RiscosPausaSituacao | null;
  pausaEm: string | null;
  pausaPor: string | null;
  pausaObservacao: string | null;
};

export function resolverPausaProcessoRiscos(tracking: {
  pausa_situacao?: string | null;
  pausa_em?: string | null;
  pausa_por?: string | null;
  pausa_observacao?: string | null;
} | null | undefined): RiscosProcessoPausa {
  const situacao = tracking?.pausa_situacao;
  if (!isRiscosPausaSituacao(situacao)) {
    return {
      pausaSituacao: null,
      pausaEm: null,
      pausaPor: null,
      pausaObservacao: null,
    };
  }
  return {
    pausaSituacao: situacao,
    pausaEm: tracking?.pausa_em ? String(tracking.pausa_em) : null,
    pausaPor: tracking?.pausa_por ? String(tracking.pausa_por) : null,
    pausaObservacao: tracking?.pausa_observacao
      ? String(tracking.pausa_observacao)
      : null,
  };
}

export function validateObservacaoPausaRiscos(
  observacao: string | null | undefined
): string | null {
  const t = String(observacao ?? "").trim();
  if (t.length > OBSERVACAO_MAX) {
    return "A observação é demasiado longa.";
  }
  return null;
}

export function podePausarProcessoRiscos(input: {
  processoCancelado?: boolean;
  processoConcluido?: boolean;
  processoPausado?: boolean;
  campanhaStatus?: string | null;
}): boolean {
  if (input.processoCancelado) return false;
  if (input.processoConcluido) return false;
  if (input.processoPausado) return false;
  if (isPesquisaEfetivamenteAberta(input.campanhaStatus)) return false;
  return true;
}

export function validatePausarProcessoRiscos(input: {
  situacao: string;
  observacao?: string | null;
  processoCancelado?: boolean;
  processoConcluido?: boolean;
  processoPausado?: boolean;
  campanhaStatus?: string | null;
}): string | null {
  if (!isRiscosPausaSituacao(input.situacao)) {
    return "Situação inválida.";
  }
  if (input.processoCancelado) {
    return "Processo cancelado não pode ser pausado.";
  }
  if (input.processoConcluido) {
    return "Processo concluído não pode ser pausado.";
  }
  if (input.processoPausado) {
    return MSG_PROCESSO_RISCOS_JA_PAUSADO;
  }
  if (isPesquisaEfetivamenteAberta(input.campanhaStatus)) {
    return MSG_PAUSA_PESQUISA_JA_ABERTA;
  }
  return validateObservacaoPausaRiscos(input.observacao);
}

export function validateRetomarProcessoRiscos(input: {
  processoPausado?: boolean;
  processoCancelado?: boolean;
}): string | null {
  if (input.processoCancelado) {
    return "Processo cancelado não pode ser retomado por esta ação.";
  }
  if (!input.processoPausado) {
    return MSG_PROCESSO_RISCOS_NAO_PAUSADO;
  }
  return null;
}
