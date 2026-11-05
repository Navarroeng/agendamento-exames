import { normalizeSearchText } from "@/lib/text-normalize";

/**
 * Tamanho de cada leitura ao percorrer uma tabela.
 * Não é um teto de resultado: a leitura segue até o lote voltar incompleto.
 * Fica abaixo do máximo padrão do PostgREST para a página não ser cortada.
 */
export const LOTE_LEITURA = 1000;

export interface PaginaConsulta<T> {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function montarPagina<T>(
  records: T[],
  total: number,
  page: number,
  pageSize: number
): PaginaConsulta<T> {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    records,
    total,
    page: total === 0 ? 1 : safePage,
    pageSize,
    totalPages,
  };
}

/** Lê todas as páginas. Erro de qualquer lote interrompe e propaga a falha. */
export async function lerTodosOsLotes<T>(
  buscar: (from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const todos: T[] = [];
  for (let from = 0; ; from += LOTE_LEITURA) {
    const lote = await buscar(from, from + LOTE_LEITURA - 1);
    todos.push(...lote);
    if (lote.length < LOTE_LEITURA) return todos;
  }
}

/** Termo de `ilike`: sem acento, sem curinga e com espaços colapsados. */
export function termoIlike(valor: string | null | undefined): string | null {
  const normalizado = normalizeSearchText(valor).replace(/[%_\\]/g, "").trim();
  return normalizado || null;
}

export function diaSeguinteIso(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function intervaloAnoIso(year: number): {
  inicio: string;
  fimExclusivo: string;
} {
  return {
    inicio: `${year}-01-01`,
    fimExclusivo: `${year + 1}-01-01`,
  };
}
