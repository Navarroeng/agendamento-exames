/**
 * Serviço pontual exclusivo: Laudo de Periculosidade (NR16).
 * Identificação por servico_id do catálogo; fallback por nome canônico
 * normalizado (match exato, sem includes).
 */

import { normalizeServicoNome, type ServicoItemRef } from "@/lib/servico-treinamentos";

export const SERVICO_PERICULOSIDADE_NOME =
  "Laudo de Periculosidade (NR16)" as const;

export const SERVICO_PERICULOSIDADE_EXCLUSIVIDADE_MSG =
  "O Laudo de Periculosidade possui proposta e fluxo próprios e deve ser contratado em um orçamento separado.";

/** Quantidade inicial da linha. O usuário informa a quantidade do serviço. */
export const SERVICO_PERICULOSIDADE_QUANTIDADE_INICIAL = 1;

export const PROPOSTA_DESCRICAO_PARAGRAFOS_PERICULOSIDADE: readonly string[] = [
  "Prestação de serviços técnicos especializados para avaliação das atividades e condições de trabalho, com realização de visita técnica, identificação e análise dos riscos, verificação do enquadramento na NR-16 e elaboração de Laudo Técnico de Periculosidade, com conclusão fundamentada quanto à caracterização ou não de condições perigosas.",
  "Segue abaixo os principais pontos a serem observados:",
  "Ponto 01 — GLP e maçarico nas injetoras.",
  "Ponto 02 — Cilindros de gases na ferramentaria.",
  "Ponto 03 — Empilhadeira a GLP e circulação externa.",
  "Ponto 04 — Rede de gás e tratamento por chama em alguns processos.",
  "Ressaltamos que a implementação das medidas corretivas indicadas é de responsabilidade da contratante.",
] as const;

export const PERICULOSIDADE_INCLUSOS_ITENS: readonly string[] = [
  "Visita técnica à empresa.",
  "Identificação e avaliação das condições de risco.",
  "Análise das atividades e áreas de risco conforme a NR-16.",
  "Elaboração do Laudo Técnico de Periculosidade.",
] as const;

export const PERICULOSIDADE_INCLUSOS_OBSERVACOES: readonly string[] = [
  "Será necessário agendar uma visita técnica para avaliação das atividades, instalações e condições de trabalho, visando verificar a caracterização ou não da periculosidade, conforme os critérios estabelecidos na NR-16.",
] as const;

const SERVICO_PERICULOSIDADE_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome(SERVICO_PERICULOSIDADE_NOME),
]);

export const SERVICO_PERICULOSIDADE_NOME_NORMALIZADO = normalizeServicoNome(
  SERVICO_PERICULOSIDADE_NOME
);

export function isServicoPericulosidadeNome(
  nome: string | null | undefined
): boolean {
  return SERVICO_PERICULOSIDADE_NOMES_NORMALIZADOS.has(
    normalizeServicoNome(nome)
  );
}

export function resolvePericulosidadeServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find((s) => isServicoPericulosidadeNome(s.nome));
  const id = (found?.id ?? "").trim();
  return id || null;
}

export function isServicoPericulosidade(
  item: ServicoItemRef,
  periculosidadeServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (periculosidadeServicoId && id) {
    return id === periculosidadeServicoId;
  }
  return isServicoPericulosidadeNome(item.servico_nome);
}

export function orcamentoPossuiPericulosidade(
  itens: ServicoItemRef[] | null | undefined,
  periculosidadeServicoId?: string | null
): boolean {
  return (itens ?? []).some((item) =>
    isServicoPericulosidade(item, periculosidadeServicoId)
  );
}

export function orcamentoEhExclusivoPericulosidade(
  itens: ServicoItemRef[] | null | undefined,
  periculosidadeServicoId?: string | null
): boolean {
  const relevant = (itens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return false;
  return relevant.every((item) =>
    isServicoPericulosidade(item, periculosidadeServicoId)
  );
}

function itemTemServico(item: ServicoItemRef): boolean {
  return (
    Boolean((item.servico_id ?? "").trim()) ||
    Boolean((item.servico_nome ?? "").trim())
  );
}

export function bloqueioPericulosidadeExclusivo(params: {
  itens: Array<ServicoItemRef & { id?: string }>;
  itemIdAlterado?: string | null;
  novoNome?: string | null;
  novoServicoId?: string | null;
  periculosidadeServicoId?: string | null;
}): string | null {
  const { itens, itemIdAlterado, periculosidadeServicoId } = params;
  const novoItem: ServicoItemRef = {
    servico_id: params.novoServicoId ?? "",
    servico_nome: params.novoNome ?? "",
  };
  const novoEhPericulosidade = isServicoPericulosidade(
    novoItem,
    periculosidadeServicoId
  );

  if (itemIdAlterado == null) {
    if (
      orcamentoPossuiPericulosidade(itens, periculosidadeServicoId) ||
      novoEhPericulosidade
    ) {
      return SERVICO_PERICULOSIDADE_EXCLUSIVIDADE_MSG;
    }
    return null;
  }

  const outros = itens.filter((item) => {
    if (item.id === itemIdAlterado) return false;
    return itemTemServico(item);
  });

  if (novoEhPericulosidade && outros.length > 0) {
    return SERVICO_PERICULOSIDADE_EXCLUSIVIDADE_MSG;
  }

  const outrosTemPericulosidade = outros.some((item) =>
    isServicoPericulosidade(item, periculosidadeServicoId)
  );
  if (
    outrosTemPericulosidade &&
    itemTemServico(novoItem) &&
    !novoEhPericulosidade
  ) {
    return SERVICO_PERICULOSIDADE_EXCLUSIVIDADE_MSG;
  }

  return null;
}
