/**
 * Serviço pontual exclusivo: Laudo de Insalubridade.
 * Identificação por servico_id do catálogo; fallback por nome canônico
 * normalizado (match exato, sem includes).
 */

import { normalizeServicoNome, type ServicoItemRef } from "@/lib/servico-treinamentos";

export const SERVICO_INSALUBRIDADE_NOME = "Laudo de Insalubridade" as const;

export const SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG =
  "O Laudo de Insalubridade possui proposta e fluxo próprios e deve ser contratado em um orçamento separado.";

export const SERVICO_INSALUBRIDADE_CONTRATO_NAO_CONFIGURADO_MSG =
  "Modelo de contrato do Laudo de Insalubridade ainda não configurado.";

/** Quantidade interna de linha (DB exige > 0). Nunca exibir como colaboradores. */
export const SERVICO_INSALUBRIDADE_QUANTIDADE_INTERNA = 1;

export const PROPOSTA_DESCRICAO_PARAGRAFOS_INSALUBRIDADE: readonly string[] = [
  "Realização de avaliação de insalubridade nas dependências da empresa, com base nos critérios estabelecidos pela Norma Regulamentadora nº 15 (NR-15) e demais normas técnicas aplicáveis. O serviço contempla visita técnica aos ambientes de trabalho, levantamento das atividades exercidas, identificação e análise dos agentes físicos, químicos e biológicos, bem como, quando necessário, a realização de medições quantitativas conforme metodologias reconhecidas. Ênfase para o cargo de auxiliar de limpeza, contemplando a avaliação das atividades executadas e análises quantitativas relacionadas à exposição de produtos domissanitários utilizados na rotina de trabalho. Ao final, será elaborado e entregue o Laudo de Insalubridade, contendo enquadramento das atividades, caracterização ou descaracterização do adicional, grau de insalubridade (mínimo, médio ou máximo), além de recomendações técnicas para adequação às exigências legais. Ressaltamos que a implementação das medidas corretivas indicadas é de responsabilidade da contratante.",
] as const;

export const INSALUBRIDADE_INCLUSOS_ITENS: readonly string[] = [
  "Visita técnica na empresa.",
  "Mapeamento dos riscos insalubres.",
  "Análises quantitativas utilizando método e equipamento adequado.",
  "Elaboração de Laudo de Insalubridade.",
] as const;

export const INSALUBRIDADE_INCLUSOS_OBSERVACOES: readonly string[] = [
  "Será necessário agendar um dia de visita prévia para avaliações quantitativas dos agentes insalubres, com uso de metodologia e equipamentos adequados.",
] as const;

const SERVICO_INSALUBRIDADE_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome(SERVICO_INSALUBRIDADE_NOME),
]);

export const SERVICO_INSALUBRIDADE_NOME_NORMALIZADO = normalizeServicoNome(
  SERVICO_INSALUBRIDADE_NOME
);

export function isServicoInsalubridadeNome(
  nome: string | null | undefined
): boolean {
  return SERVICO_INSALUBRIDADE_NOMES_NORMALIZADOS.has(
    normalizeServicoNome(nome)
  );
}

export function resolveInsalubridadeServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find((s) => isServicoInsalubridadeNome(s.nome));
  const id = (found?.id ?? "").trim();
  return id || null;
}

export function isServicoInsalubridade(
  item: ServicoItemRef,
  insalubridadeServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (insalubridadeServicoId && id) {
    return id === insalubridadeServicoId;
  }
  return isServicoInsalubridadeNome(item.servico_nome);
}

export function orcamentoPossuiInsalubridade(
  itens: ServicoItemRef[] | null | undefined,
  insalubridadeServicoId?: string | null
): boolean {
  return (itens ?? []).some((item) =>
    isServicoInsalubridade(item, insalubridadeServicoId)
  );
}

export function orcamentoEhExclusivoInsalubridade(
  itens: ServicoItemRef[] | null | undefined,
  insalubridadeServicoId?: string | null
): boolean {
  const relevant = (itens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return false;
  return relevant.every((item) =>
    isServicoInsalubridade(item, insalubridadeServicoId)
  );
}

function itemTemServico(item: ServicoItemRef): boolean {
  return (
    Boolean((item.servico_id ?? "").trim()) ||
    Boolean((item.servico_nome ?? "").trim())
  );
}

export function bloqueioInsalubridadeExclusivo(params: {
  itens: Array<ServicoItemRef & { id?: string }>;
  itemIdAlterado?: string | null;
  novoNome?: string | null;
  novoServicoId?: string | null;
  insalubridadeServicoId?: string | null;
}): string | null {
  const { itens, itemIdAlterado, insalubridadeServicoId } = params;
  const novoItem: ServicoItemRef = {
    servico_id: params.novoServicoId ?? "",
    servico_nome: params.novoNome ?? "",
  };
  const novoEhInsalubridade = isServicoInsalubridade(
    novoItem,
    insalubridadeServicoId
  );

  if (itemIdAlterado == null) {
    if (
      orcamentoPossuiInsalubridade(itens, insalubridadeServicoId) ||
      novoEhInsalubridade
    ) {
      return SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG;
    }
    return null;
  }

  const outros = itens.filter((item) => {
    if (item.id === itemIdAlterado) return false;
    return itemTemServico(item);
  });

  if (novoEhInsalubridade && outros.length > 0) {
    return SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG;
  }

  const outrosTemInsalubridade = outros.some((item) =>
    isServicoInsalubridade(item, insalubridadeServicoId)
  );
  if (
    outrosTemInsalubridade &&
    itemTemServico(novoItem) &&
    !novoEhInsalubridade
  ) {
    return SERVICO_INSALUBRIDADE_EXCLUSIVIDADE_MSG;
  }

  return null;
}
