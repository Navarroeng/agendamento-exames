/**
 * Família de laudos pontuais exclusivos (AET + Insalubridade).
 * Sem terceira modalidade. Identificação canônica; nunca includes().
 */

import {
  bloqueioAetExclusivo,
  isServicoAet,
  isServicoAetNome,
  orcamentoEhExclusivoAet,
  orcamentoPossuiAet,
  SERVICO_AET_EXCLUSIVIDADE_MSG,
  SERVICO_AET_QUANTIDADE_INTERNA,
} from "@/lib/servico-aet";
import {
  bloqueioInsalubridadeExclusivo,
  isServicoInsalubridade,
  isServicoInsalubridadeNome,
  orcamentoEhExclusivoInsalubridade,
  orcamentoPossuiInsalubridade,
  SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG,
  SERVICO_INSALUBRIDADE_QUANTIDADE_INTERNA,
} from "@/lib/servico-insalubridade";
import type {
  OrcamentoFluxoImplantacao,
  ServicoItemRef,
} from "@/lib/servico-treinamentos";

export type LaudoPontualKind = "aet" | "insalubridade";

export const SERVICO_LAUDO_PONTUAL_QUANTIDADE_INTERNA =
  SERVICO_AET_QUANTIDADE_INTERNA;

export function isFluxoLaudoPontual(
  fluxo: OrcamentoFluxoImplantacao | null | undefined
): boolean {
  return fluxo === "aet" || fluxo === "insalubridade";
}

/** Origem da edição operacional do laudo pontual. */
export type LaudoPontualEdicaoOrigem = "implantacao" | "laudos_sst";

export const LAUDO_PONTUAL_ELABORACAO_ENVIO_SOMENTE_LAUDOS_SST_MSG =
  "A elaboração e o envio do laudo pontual são acompanhados somente em Laudos SST.";

export function assertPodeEditarElaboracaoEnvioLaudoPontual(
  origem: LaudoPontualEdicaoOrigem | null | undefined
): void {
  if (origem !== "laudos_sst") {
    throw new Error(LAUDO_PONTUAL_ELABORACAO_ENVIO_SOMENTE_LAUDOS_SST_MSG);
  }
}

export function fluxoToLaudoPontualKind(
  fluxo: OrcamentoFluxoImplantacao | null | undefined
): LaudoPontualKind | null {
  if (fluxo === "aet" || fluxo === "insalubridade") return fluxo;
  return null;
}

export function resolveLaudoPontualKindFromImplantacao(params: {
  fluxo?: OrcamentoFluxoImplantacao | null;
  itens?: ServicoItemRef[] | null;
}): LaudoPontualKind | null {
  return (
    fluxoToLaudoPontualKind(params.fluxo) ??
    resolveLaudoPontualKind(params.itens)
  );
}

export function copyLaudoPontual(kind: LaudoPontualKind): {
  titulo: string;
  andamento: string;
  abaElaboracao: string;
  textoElaboracao: string;
  upload: string;
  nomeCurto: string;
  anexeAntesDeConcluir: string;
  concluaAntesEnvio: string;
  textoEnvio: string;
  toastCarregarErro: string;
  toastAnexado: string;
  auditVisitaRealizada: (usuario: string) => string;
  auditVisitaAgendada: (usuario: string) => string;
  auditLaudoAnexado: (usuario: string) => string;
  auditElaboracaoConcluida: (usuario: string) => string;
  auditElaboracaoAtualizada: (usuario: string) => string;
  auditEnvioConfirmado: (usuario: string) => string;
} {
  if (kind === "insalubridade") {
    return {
      titulo: "Laudo de Insalubridade",
      andamento: "Andamento do Laudo de Insalubridade",
      abaElaboracao: "Insalub. em elaboração",
      textoElaboracao:
        "Acompanhe a elaboração do Laudo de Insalubridade após a visita. Anexe o PDF final antes de concluir.",
      upload: "Laudo de Insalubridade final (PDF)",
      nomeCurto: "Laudo de Insalubridade",
      anexeAntesDeConcluir:
        "Anexe o Laudo de Insalubridade final antes de concluir esta etapa.",
      concluaAntesEnvio:
        "Conclua a elaboração do Laudo de Insalubridade e anexe o PDF final antes de registrar o envio.",
      textoEnvio:
        "Registre o envio do Laudo de Insalubridade ao cliente. O envio automático por e-mail não faz parte desta etapa.",
      toastCarregarErro:
        "Não foi possível carregar o acompanhamento do Laudo de Insalubridade.",
      toastAnexado: "Laudo de Insalubridade anexado.",
      auditVisitaRealizada: (usuario) =>
        `${usuario} registrou a visita do Laudo de Insalubridade como realizada.`,
      auditVisitaAgendada: (usuario) =>
        `${usuario} atualizou o agendamento da visita do Laudo de Insalubridade.`,
      auditLaudoAnexado: (usuario) =>
        `${usuario} anexou o Laudo de Insalubridade final.`,
      auditElaboracaoConcluida: (usuario) =>
        `${usuario} concluiu a elaboração do Laudo de Insalubridade.`,
      auditElaboracaoAtualizada: (usuario) =>
        `${usuario} atualizou a elaboração do Laudo de Insalubridade.`,
      auditEnvioConfirmado: (usuario) =>
        `${usuario} confirmou o envio do Laudo de Insalubridade ao cliente.`,
    };
  }
  return {
    titulo: "Laudo AET",
    andamento: "Andamento do Laudo AET",
    abaElaboracao: "AET em elaboração",
    textoElaboracao:
      "Acompanhe a elaboração do Laudo AET após a visita. Anexe o PDF final antes de concluir.",
    upload: "Laudo AET final (PDF)",
    nomeCurto: "AET",
    anexeAntesDeConcluir:
      "Anexe o Laudo AET final antes de concluir esta etapa.",
    concluaAntesEnvio:
      "Conclua a elaboração do AET e anexe o PDF final antes de registrar o envio.",
    textoEnvio:
      "Registre o envio do Laudo AET ao cliente. O envio automático por e-mail não faz parte desta etapa.",
    toastCarregarErro: "Não foi possível carregar o acompanhamento do AET.",
    toastAnexado: "Laudo AET anexado.",
    auditVisitaRealizada: (usuario) =>
      `${usuario} registrou a visita do AET como realizada.`,
    auditVisitaAgendada: (usuario) =>
      `${usuario} atualizou o agendamento da visita do AET.`,
    auditLaudoAnexado: (usuario) => `${usuario} anexou o Laudo AET final.`,
    auditElaboracaoConcluida: (usuario) =>
      `${usuario} concluiu a elaboração do AET.`,
    auditElaboracaoAtualizada: (usuario) =>
      `${usuario} atualizou a elaboração do AET.`,
    auditEnvioConfirmado: (usuario) =>
      `${usuario} confirmou o envio do AET ao cliente.`,
  };
}

export function isServicoLaudoPontualNome(
  nome: string | null | undefined
): boolean {
  return isServicoAetNome(nome) || isServicoInsalubridadeNome(nome);
}

export function isServicoLaudoPontual(
  item: ServicoItemRef,
  ids?: {
    aetServicoId?: string | null;
    insalubridadeServicoId?: string | null;
  }
): boolean {
  return (
    isServicoAet(item, ids?.aetServicoId) ||
    isServicoInsalubridade(item, ids?.insalubridadeServicoId)
  );
}

export function resolveLaudoPontualKind(
  itens: ServicoItemRef[] | null | undefined,
  ids?: {
    aetServicoId?: string | null;
    insalubridadeServicoId?: string | null;
  }
): LaudoPontualKind | null {
  if (orcamentoEhExclusivoAet(itens, ids?.aetServicoId)) return "aet";
  if (
    orcamentoEhExclusivoInsalubridade(itens, ids?.insalubridadeServicoId)
  ) {
    return "insalubridade";
  }
  return null;
}

export function isLaudoPontualExclusivo(
  itens: ServicoItemRef[] | null | undefined,
  ids?: {
    aetServicoId?: string | null;
    insalubridadeServicoId?: string | null;
  }
): boolean {
  return resolveLaudoPontualKind(itens, ids) !== null;
}

export function orcamentoPossuiLaudoPontual(
  itens: ServicoItemRef[] | null | undefined,
  ids?: {
    aetServicoId?: string | null;
    insalubridadeServicoId?: string | null;
  }
): boolean {
  return (
    orcamentoPossuiAet(itens, ids?.aetServicoId) ||
    orcamentoPossuiInsalubridade(itens, ids?.insalubridadeServicoId)
  );
}

export function quantidadeInternaLaudoPontual(
  nome: string | null | undefined
): number {
  if (isServicoInsalubridadeNome(nome)) {
    return SERVICO_INSALUBRIDADE_QUANTIDADE_INTERNA;
  }
  return SERVICO_LAUDO_PONTUAL_QUANTIDADE_INTERNA;
}

export function mensagemExclusividadeLaudoPontual(
  itens: ServicoItemRef[] | null | undefined,
  ids?: {
    aetServicoId?: string | null;
    insalubridadeServicoId?: string | null;
  }
): string | null {
  if (
    orcamentoPossuiInsalubridade(itens, ids?.insalubridadeServicoId) &&
    !orcamentoEhExclusivoInsalubridade(itens, ids?.insalubridadeServicoId)
  ) {
    return SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG;
  }
  if (
    orcamentoPossuiAet(itens, ids?.aetServicoId) &&
    !orcamentoEhExclusivoAet(itens, ids?.aetServicoId)
  ) {
    return SERVICO_AET_EXCLUSIVIDADE_MSG;
  }
  return null;
}

export function bloqueioLaudoPontualExclusivo(params: {
  itens: Array<ServicoItemRef & { id?: string }>;
  itemIdAlterado?: string | null;
  novoNome?: string | null;
  novoServicoId?: string | null;
  aetServicoId?: string | null;
  insalubridadeServicoId?: string | null;
}): string | null {
  const novoItem: ServicoItemRef = {
    servico_id: params.novoServicoId ?? "",
    servico_nome: params.novoNome ?? "",
  };
  if (isServicoInsalubridade(novoItem, params.insalubridadeServicoId)) {
    return (
      bloqueioInsalubridadeExclusivo(params) ??
      bloqueioAetExclusivo(params)
    );
  }
  if (isServicoAet(novoItem, params.aetServicoId)) {
    return (
      bloqueioAetExclusivo(params) ??
      bloqueioInsalubridadeExclusivo(params)
    );
  }
  return (
    bloqueioAetExclusivo(params) ??
    bloqueioInsalubridadeExclusivo(params)
  );
}
