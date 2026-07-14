/** Nome canônico do exame Clínico no catálogo. */
export const EXAME_CLINICO_NOME = "Clínico";

export const CLINICO_VALOR_ASO_ADMISSIONAL = 100;
export const CLINICO_VALOR_ASO_RETORNO_TRABALHO = 100;
export const CLINICO_VALOR_ASO_PERIODICO = 0;

function normalizeExameNome(nome: string): string {
  return nome
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export const EXAME_SEM_CUSTO_CLINICA_MSG =
  "Este exame não possui custo cadastrado para a clínica selecionada.";

/** Clínico: valor cliente manual; custo clínica vem de clinica_exames. */
export function isExameClinicoManual(nome: string): boolean {
  return normalizeExameNome(nome) === normalizeExameNome(EXAME_CLINICO_NOME);
}

/** Nome usado na busca de preço (catálogo usa acento). */
export function nomeExameParaBuscaPreco(nome: string): string {
  return isExameClinicoManual(nome) ? EXAME_CLINICO_NOME : nome.trim();
}

/** Valor Navarro automático do Clínico conforme tipo de ASO. */
export function getClinicoValorNavarroAuto(aso: string): number | null {
  const tipo = aso.trim();
  if (tipo === "Admissional") return CLINICO_VALOR_ASO_ADMISSIONAL;
  if (tipo === "Retorno ao Trabalho") return CLINICO_VALOR_ASO_RETORNO_TRABALHO;
  if (tipo === "Periódico") return CLINICO_VALOR_ASO_PERIODICO;
  return null;
}

export function permiteClinicoValorZero(aso: string): boolean {
  return aso.trim() === "Periódico";
}
