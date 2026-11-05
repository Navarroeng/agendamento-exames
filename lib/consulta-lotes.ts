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

/** Termo de busca: sem acento, sem curinga e com espaços colapsados. */
export function termoIlike(valor: string | null | undefined): string | null {
  const normalizado = normalizeSearchText(valor).replace(/[%_\\]/g, "").trim();
  return normalizado || null;
}

const CLASSE_ACENTO: Record<string, string> = {
  A: "AÁÀÂÃÄaáàâãä",
  E: "EÉÈÊËeéèêë",
  I: "IÍÌÎÏiíìîï",
  O: "OÓÒÔÕÖoóòôõö",
  U: "UÚÙÛÜuúùûü",
  C: "CÇcç",
  N: "NÑnñ",
};

/**
 * Padrão `~*` em que cada letra casa com ou sem acento.
 * O termo digitado e o texto gravado entram na mesma comparação.
 */
export function termoBuscaRegex(valor: string | null | undefined): string | null {
  const termo = termoIlike(valor);
  if (!termo) return null;
  const tokens = termo
    .split(" ")
    .map((token) => {
      let padrao = "";
      for (const char of token) {
        const classe = CLASSE_ACENTO[char];
        if (classe) padrao += `[${classe}]`;
        else padrao += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
      return padrao;
    })
    .filter(Boolean);
  return tokens.length > 0 ? tokens.join("\\s+") : null;
}

/** Quantos identificadores entram em cada `in`. A resposta de cada grupo ainda é paginada. */
export const LOTE_IDENTIFICADORES = 100;

/**
 * Lê todas as linhas de uma lista de ids.
 * Parte os ids para a URL não estourar e pagina cada parte até o lote voltar curto.
 */
export async function lerPorIdentificadores<T>(
  ids: readonly string[],
  buscar: (ids: string[], from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const unicos = Array.from(
    new Set(ids.map((id) => String(id).trim()).filter(Boolean))
  );
  const todos: T[] = [];
  for (let indice = 0; indice < unicos.length; indice += LOTE_IDENTIFICADORES) {
    const grupo = unicos.slice(indice, indice + LOTE_IDENTIFICADORES);
    const lote = await lerTodosOsLotes((from, to) => buscar(grupo, from, to));
    todos.push(...lote);
  }
  return todos;
}

/**
 * Orçamento da lista de ids numa gravação. O teto de linhas do PostgREST
 * limita a resposta de uma leitura, não o UPDATE. O limite real da gravação
 * é o tamanho da URL: acima dele a requisição não é enviada.
 */
export const ORCAMENTO_URL_GRAVACAO = 6000;

export const GRAVACAO_NAO_APLICADA =
  "A operação não foi aplicada: a quantidade de registros não cabe em uma única gravação.";

export function identificadoresUnicos(ids: readonly string[]): string[] {
  return Array.from(
    new Set(ids.map((id) => String(id).trim()).filter(Boolean))
  );
}

export function identificadoresCabemNaGravacao(ids: readonly string[]): boolean {
  const tamanho = ids.reduce((soma, id) => soma + id.length + 1, 0);
  return tamanho <= ORCAMENTO_URL_GRAVACAO;
}

/** Devolve a lista única ou interrompe antes de qualquer gravação. */
export function exigirGravacaoUnica(ids: readonly string[]): string[] {
  const lista = identificadoresUnicos(ids);
  if (!identificadoresCabemNaGravacao(lista)) {
    throw new Error(GRAVACAO_NAO_APLICADA);
  }
  return lista;
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
