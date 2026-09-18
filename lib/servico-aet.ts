/**
 * Serviço pontual exclusivo: Laudo AET – Análise Ergonômica do Trabalho.
 * Identificação por servico_id do catálogo; fallback por nome canônico
 * normalizado (match exato, sem includes).
 */

import { normalizeServicoNome, type ServicoItemRef } from "@/lib/servico-treinamentos";

export const SERVICO_AET_NOME =
  "Laudo AET – Análise Ergonômica do Trabalho" as const;

export const SERVICO_AET_EXCLUSIVIDADE_MSG =
  "O Laudo AET possui proposta e fluxo próprios e deve ser contratado em um orçamento separado.";

/** Quantidade interna de linha (DB exige > 0). Nunca exibir como colaboradores. */
export const SERVICO_AET_QUANTIDADE_INTERNA = 1;

export const PROPOSTA_DESCRICAO_PARAGRAFOS_AET: readonly string[] = [
  "A presente proposta contempla a elaboração da Análise Ergonômica do Trabalho (AET), com avaliação das condições de trabalho, organização das atividades, exigências das tarefas e fatores ergonômicos relacionados às funções avaliadas, conforme os critérios aplicáveis da NR-17.",
  "O trabalho contempla levantamento das informações, análise técnica das atividades e condições observadas durante a avaliação, identificação dos fatores de risco ergonômico e elaboração do relatório técnico com conclusões e recomendações de medidas de prevenção e adequação, quando aplicáveis.",
  "Laudo elaborado conforme os critérios aplicáveis da NR-17 – Ergonomia.",
] as const;

export const AET_INCLUSOS_ITENS: readonly string[] = [
  "Visita técnica para avaliação das atividades e postos de trabalho.",
  "Levantamento das condições de trabalho e organização das atividades.",
  "Análise dos fatores de risco ergonômico relacionados às funções avaliadas.",
  "Avaliação das exigências físicas, cognitivas e organizacionais das atividades, quando aplicáveis.",
  "Registro das condições observadas durante a avaliação.",
  "Elaboração do Laudo AET – Análise Ergonômica do Trabalho.",
  "Recomendações técnicas para prevenção, adequação e melhoria das condições ergonômicas, quando aplicáveis.",
  "Entrega do documento final em formato digital.",
] as const;

const SERVICO_AET_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome(SERVICO_AET_NOME),
  normalizeServicoNome("Laudo AET - Análise Ergonômica do Trabalho"),
]);

export const SERVICO_AET_NOME_NORMALIZADO = normalizeServicoNome(
  SERVICO_AET_NOME
);

export function isServicoAetNome(nome: string | null | undefined): boolean {
  return SERVICO_AET_NOMES_NORMALIZADOS.has(normalizeServicoNome(nome));
}

export function resolveAetServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find((s) => isServicoAetNome(s.nome));
  const id = (found?.id ?? "").trim();
  return id || null;
}

export function isServicoAet(
  item: ServicoItemRef,
  aetServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (aetServicoId && id) {
    return id === aetServicoId;
  }
  return isServicoAetNome(item.servico_nome);
}

export function orcamentoPossuiAet(
  itens: ServicoItemRef[] | null | undefined,
  aetServicoId?: string | null
): boolean {
  return (itens ?? []).some((item) => isServicoAet(item, aetServicoId));
}

export function orcamentoEhExclusivoAet(
  itens: ServicoItemRef[] | null | undefined,
  aetServicoId?: string | null
): boolean {
  const relevant = (itens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return false;
  return relevant.every((item) => isServicoAet(item, aetServicoId));
}

/** AET exclusivo não tem à vista. Demais Pontuais (SST, treinamentos) sim. */
export function orcamentoPermitePagamentoAVista(
  itens: ServicoItemRef[] | null | undefined,
  aetServicoId?: string | null
): boolean {
  return !orcamentoEhExclusivoAet(itens, aetServicoId);
}

function itemTemServico(item: ServicoItemRef): boolean {
  return (
    Boolean((item.servico_id ?? "").trim()) ||
    Boolean((item.servico_nome ?? "").trim())
  );
}

/**
 * AET não pode coexistir com outro serviço no mesmo orçamento.
 * `itemIdAlterado` é a linha que está recebendo o novo serviço (null = inclusão).
 */
export function bloqueioAetExclusivo(params: {
  itens: Array<ServicoItemRef & { id?: string }>;
  itemIdAlterado?: string | null;
  novoNome?: string | null;
  novoServicoId?: string | null;
  aetServicoId?: string | null;
}): string | null {
  const { itens, itemIdAlterado, aetServicoId } = params;
  const novoItem: ServicoItemRef = {
    servico_id: params.novoServicoId ?? "",
    servico_nome: params.novoNome ?? "",
  };
  const novoEhAet = isServicoAet(novoItem, aetServicoId);

  if (itemIdAlterado == null) {
    if (orcamentoPossuiAet(itens, aetServicoId) || novoEhAet) {
      return SERVICO_AET_EXCLUSIVIDADE_MSG;
    }
    return null;
  }

  const outros = itens.filter((item) => {
    if (item.id === itemIdAlterado) return false;
    return itemTemServico(item);
  });

  if (novoEhAet && outros.length > 0) {
    return SERVICO_AET_EXCLUSIVIDADE_MSG;
  }

  const outrosTemAet = outros.some((item) => isServicoAet(item, aetServicoId));
  if (outrosTemAet && itemTemServico(novoItem) && !novoEhAet) {
    return SERVICO_AET_EXCLUSIVIDADE_MSG;
  }

  return null;
}

export type TipoDocumentoContrato = "aet" | "mensalidade" | "pontual_sst";

export function resolveTipoDocumentoContrato(params: {
  modalidade?: string | null;
  itens?: ServicoItemRef[] | null;
  aetServicoId?: string | null;
  isMensalidade?: boolean;
}): TipoDocumentoContrato {
  if (orcamentoEhExclusivoAet(params.itens, params.aetServicoId)) {
    return "aet";
  }
  if (params.isMensalidade) return "mensalidade";
  return "pontual_sst";
}
