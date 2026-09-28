/**
 * Serviço pontual LTCAT. Pode coexistir com outros serviços no mesmo orçamento.
 * Identificação por servico_id do catálogo; fallback pelo nome canônico
 * normalizado (match exato, sem includes). Não confundir com a linha
 * "LTCAT - Laudo técnico..." dos itens inclusos do pacote SST.
 */

import { normalizeServicoNome, type ServicoItemRef } from "@/lib/servico-treinamentos";

export const SERVICO_LTCAT_NOME = "LTCAT" as const;

/** Nome da linha na proposta e na visualização. O cadastro permanece "LTCAT". */
export const SERVICO_LTCAT_NOME_EXIBICAO =
  "LTCAT – Laudo Técnico das Condições Ambientais do Trabalho" as const;

export const SERVICO_LTCAT_CONTRATO_NAO_CONFIGURADO_MSG =
  "Modelo de contrato do LTCAT ainda não configurado.";

export const PROPOSTA_DESCRICAO_PARAGRAFOS_LTCAT: readonly string[] = [
  "LTCAT – Laudo Técnico das Condições Ambientais do Trabalho",
  "Elaboração de laudo técnico para avaliação das condições ambientais de trabalho, com identificação e análise da exposição dos colaboradores aos agentes nocivos ocupacionais, visando subsidiar o enquadramento previdenciário e as informações relacionadas à aposentadoria especial e ao eSocial.",
] as const;

export const LTCAT_INCLUSOS_ITENS: readonly string[] = [
  "Visita técnica para levantamento das atividades e condições de trabalho.",
  "Identificação dos ambientes, funções e possíveis agentes nocivos ocupacionais.",
  "Avaliação das exposições, com medições quando necessárias e previstas no escopo contratado.",
  "Análise técnica para fins de enquadramento previdenciário.",
  "Elaboração do LTCAT com conclusão por função ou grupo avaliado.",
  "Entrega do laudo final em formato digital.",
] as const;

const SERVICO_LTCAT_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome(SERVICO_LTCAT_NOME),
  normalizeServicoNome(SERVICO_LTCAT_NOME_EXIBICAO),
  normalizeServicoNome(
    "LTCAT - Laudo Técnico das Condições Ambientais do Trabalho"
  ),
]);

export const SERVICO_LTCAT_NOME_NORMALIZADO = normalizeServicoNome(
  SERVICO_LTCAT_NOME
);

export function isServicoLtcatNome(nome: string | null | undefined): boolean {
  return SERVICO_LTCAT_NOMES_NORMALIZADOS.has(normalizeServicoNome(nome));
}

/** Rótulo da tabela. Não altera o nome gravado no item nem no catálogo. */
export function labelNomeServicoLtcat(nome: string | null | undefined): string {
  const texto = (nome ?? "").trim();
  if (!isServicoLtcatNome(texto)) return texto;
  return SERVICO_LTCAT_NOME_EXIBICAO;
}

export function resolveLtcatServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find((s) => isServicoLtcatNome(s.nome));
  const id = (found?.id ?? "").trim();
  return id || null;
}

export function isServicoLtcat(
  item: ServicoItemRef,
  ltcatServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (ltcatServicoId && id) {
    return id === ltcatServicoId;
  }
  return isServicoLtcatNome(item.servico_nome);
}

export function orcamentoPossuiLtcat(
  itens: ServicoItemRef[] | null | undefined,
  ltcatServicoId?: string | null
): boolean {
  return (itens ?? []).some((item) => isServicoLtcat(item, ltcatServicoId));
}

export function orcamentoEhExclusivoLtcat(
  itens: ServicoItemRef[] | null | undefined,
  ltcatServicoId?: string | null
): boolean {
  const relevant = (itens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return false;
  return relevant.every((item) => isServicoLtcat(item, ltcatServicoId));
}

const LEGACY_VALOR_TOLERANCE = 0.01;

/**
 * Valor do LTCAT é o total digitado. Quantidade de colaboradores registra
 * a abrangência e não multiplica o valor. Se um registro antigo gravou
 * total = quantidade × unitário, devolve o unitário digitado.
 */
export function resolveValorTotalLtcat(item: {
  quantidade?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
}): number {
  const qty = Number(item.quantidade);
  const unit = Number(item.valor_unitario);
  const total = Number(item.valor_total);
  const unitOk = Number.isFinite(unit) && unit > 0;
  const totalOk = Number.isFinite(total) && total > 0;
  if (
    Number.isFinite(qty) &&
    qty > 1 &&
    unitOk &&
    totalOk &&
    Math.abs(total - qty * unit) <= LEGACY_VALOR_TOLERANCE
  ) {
    return unit;
  }
  if (totalOk) return total;
  if (unitOk) return unit;
  return 0;
}
