import { normalizeServicoNome } from "@/lib/servico-treinamentos";

export const PACOTE_COMPLETO_SST_NOME = "Pacote completo - SST";

export const PACOTE_COMPLETO_SST_NOME_NORMALIZADO = normalizeServicoNome(
  PACOTE_COMPLETO_SST_NOME
);

export type ServicoItemPacoteRef = {
  servico_id?: string | null;
  servico_nome?: string | null;
};

export const PACOTE_COMPLETO_SST_ITENS: readonly string[] = [
  "PGR - Programa de gerenciamento de riscos.",
  "LTCAT - Laudo técnico das condições do ambiente de trabalho.",
  "PCMSO - NR07 - Programa de controle médico de saúde ocupacional.",
  "ASO - Atestado de saúde ocupacional.",
  "Laudo de Riscos Psicossociais - Nova NR - 01",
] as const;

export function parseItensInclusos(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string") {
    try {
      return parseItensInclusos(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

export function isPacoteCompletoSst(nome: string | null | undefined): boolean {
  return nome?.trim() === PACOTE_COMPLETO_SST_NOME;
}

/** Comparação de nome sem acento/caixa — fallback quando não há `servico_id`. */
export function isPacoteCompletoSstNome(
  nome: string | null | undefined
): boolean {
  return (
    normalizeServicoNome(nome) === PACOTE_COMPLETO_SST_NOME_NORMALIZADO
  );
}

export function resolvePacoteCompletoSstServicoId(
  servicos: Array<{ id: string; nome: string }>
): string | null {
  const found = servicos.find((s) => isPacoteCompletoSstNome(s.nome));
  const id = (found?.id ?? "").trim();
  return id || null;
}

/**
 * Item é o serviço principal "Pacote completo - SST".
 * Prefere `servico_id` do catálogo; nome normalizado só se o ID não for confiável.
 * Não interpreta PGR/LTCAT/PCMSO avulsos nem `itens_inclusos` do pacote.
 */
export function isItemPacoteCompletoSst(
  item: ServicoItemPacoteRef,
  pacoteServicoId?: string | null
): boolean {
  const itemId = (item.servico_id ?? "").trim();
  const catalogId = (pacoteServicoId ?? "").trim();
  if (catalogId && itemId) return itemId === catalogId;
  return isPacoteCompletoSstNome(item.servico_nome);
}

/** True se QUALQUER item aprovado for o Pacote completo - SST. */
export function orcamentoPossuiPacoteCompletoSst(
  itens: ServicoItemPacoteRef[] | null | undefined,
  pacoteServicoId?: string | null
): boolean {
  return (itens ?? []).some((item) =>
    isItemPacoteCompletoSst(item, pacoteServicoId)
  );
}

export function resolveItensInclusosServico(
  servico:
    | {
        nome?: string | null;
        itens_inclusos?: unknown;
      }
    | null
    | undefined,
  servicoNome?: string | null
): string[] {
  const parsed = parseItensInclusos(servico?.itens_inclusos);
  if (parsed.length > 0) return parsed;

  const nome = servico?.nome ?? servicoNome ?? "";
  if (isPacoteCompletoSst(nome)) {
    return [...PACOTE_COMPLETO_SST_ITENS];
  }

  return [];
}
