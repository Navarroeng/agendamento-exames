/** Normaliza texto para comparação em buscas (ignora acentos, caixa e espaços extras). */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function textMatchesSearch(
  haystack: string | null | undefined,
  query: string
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(haystack).includes(normalizedQuery);
}

export function textsMatchSearch(
  haystacks: Array<string | null | undefined>,
  query: string
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  const combined = haystacks.filter(Boolean).join(" ");
  return normalizeSearchText(combined).includes(normalizedQuery);
}

/** Exibe em caixa alta durante a digitação (preserva espaços digitados). */
export function formatUppercaseInput(value: string): string {
  return value.toLocaleUpperCase("pt-BR");
}

/** Valor final para salvar em campos padronizados em caixa alta. */
export function normalizeUppercaseField(value: string | null | undefined): string {
  return formatUppercaseInput(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim();
}

export function isUppercaseField(
  module: keyof typeof UPPERCASE_FIELDS_BY_MODULE,
  field: string
): boolean {
  return (UPPERCASE_FIELDS_BY_MODULE[module] as readonly string[]).includes(
    field
  );
}

export const UPPERCASE_FIELDS_BY_MODULE = {
  agendamento: ["colaborador"],
  cliente: ["nome"],
  cargo: ["nome"],
  clinica: [
    "razao_social",
    "nome_fantasia",
    "cidade",
    "bairro",
    "rua",
    "responsavel",
  ],
  orcamento: ["contato", "responsavel"],
} as const;

export type UppercaseFieldModule = keyof typeof UPPERCASE_FIELDS_BY_MODULE;
