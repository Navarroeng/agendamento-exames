/**
 * Serviço pontual PGR. Pode coexistir com outros serviços, como o LTCAT.
 * Identificação por servico_id do catálogo; fallback pelo nome canônico
 * normalizado (match exato, sem includes). Não confundir com a linha
 * "PGR - Programa de gerenciamento de riscos." dos itens inclusos do pacote SST.
 */

import { normalizeServicoNome, type ServicoItemRef } from "@/lib/servico-treinamentos";

export const SERVICO_PGR_NOME =
  "PGR - Programa de Gerenciamento de Riscos" as const;

export const SERVICO_PGR_QUANTIDADE_INICIAL = 1;

export const PROPOSTA_DESCRICAO_PARAGRAFOS_PGR: readonly string[] = [
  "Prestação de serviços técnicos para elaboração do PGR – Programa de Gerenciamento de Riscos, com visita técnica, reconhecimento das atividades e dos ambientes de trabalho e avaliação dos riscos ocupacionais.",
  "O documento contemplará o inventário de riscos ocupacionais e o plano de ação, com as medidas de prevenção e controle aplicáveis ao escopo contratado, conforme a NR-01.",
] as const;

export const PGR_INCLUSOS_ITENS: readonly string[] = [
  "Visita técnica para reconhecimento das atividades e dos ambientes de trabalho.",
  "Identificação dos perigos e avaliação dos riscos ocupacionais.",
  "Elaboração do inventário de riscos ocupacionais.",
  "Elaboração do plano de ação, com medidas de prevenção e controle.",
  "Elaboração do PGR – Programa de Gerenciamento de Riscos.",
  "Entrega do documento final em formato digital.",
] as const;

export const PGR_INCLUSOS_OBSERVACOES: readonly string[] = [
  "O PGR abrangerá o inventário de riscos ocupacionais e o plano de ação das atividades e ambientes previstos no escopo contratado.",
  "A implementação das medidas indicadas no plano de ação é de responsabilidade da contratante.",
] as const;

const SERVICO_PGR_NOMES_NORMALIZADOS = new Set([
  normalizeServicoNome(SERVICO_PGR_NOME),
]);

export const SERVICO_PGR_NOME_NORMALIZADO = normalizeServicoNome(
  SERVICO_PGR_NOME
);

export function isServicoPgrNome(nome: string | null | undefined): boolean {
  return SERVICO_PGR_NOMES_NORMALIZADOS.has(normalizeServicoNome(nome));
}

export function resolvePgrServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find((s) => isServicoPgrNome(s.nome));
  const id = (found?.id ?? "").trim();
  return id || null;
}

export function isServicoPgr(
  item: ServicoItemRef,
  pgrServicoId?: string | null
): boolean {
  const id = (item.servico_id ?? "").trim();
  if (pgrServicoId && id) {
    return id === pgrServicoId;
  }
  return isServicoPgrNome(item.servico_nome);
}

export function orcamentoPossuiPgr(
  itens: ServicoItemRef[] | null | undefined,
  pgrServicoId?: string | null
): boolean {
  return (itens ?? []).some((item) => isServicoPgr(item, pgrServicoId));
}

export function orcamentoEhExclusivoPgr(
  itens: ServicoItemRef[] | null | undefined,
  pgrServicoId?: string | null
): boolean {
  const relevant = (itens ?? []).filter(
    (item) =>
      Boolean((item.servico_id ?? "").trim()) ||
      Boolean((item.servico_nome ?? "").trim())
  );
  if (relevant.length === 0) return false;
  return relevant.every((item) => isServicoPgr(item, pgrServicoId));
}

const LEGACY_VALOR_TOLERANCE = 0.01;

/**
 * Valor do PGR é o total digitado. A quantidade informada não multiplica
 * o valor. Se um registro antigo gravou total = quantidade × unitário,
 * devolve o unitário digitado.
 */
export function resolveValorTotalPgr(item: {
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
