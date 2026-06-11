/** Ordenação A→Z em pt-BR, ignorando maiúsculas/minúsculas. */
export function compareByLabel(a: string, b: string): number {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

export function sortByNome<T extends { nome: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => compareByLabel(a.nome, b.nome));
}

export function sortByLabel<T>(
  items: T[],
  getLabel: (item: T) => string
): T[] {
  return [...items].sort((a, b) =>
    compareByLabel(getLabel(a), getLabel(b))
  );
}
