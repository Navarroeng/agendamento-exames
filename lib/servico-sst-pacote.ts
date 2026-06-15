export const PACOTE_COMPLETO_SST_NOME = "Pacote completo - SST";

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
