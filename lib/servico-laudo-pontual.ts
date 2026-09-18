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
