/**
 * Textos intermediários oficiais do Formulário COPSOQ II-Br.
 * Fonte: PDF "COPSOQ II - Formulário de Aplicação".
 *
 * Somente estes interstícios podem aparecer no portal do colaborador.
 * Dimensões internas NÃO geram telas intermediárias automaticamente.
 */

export type CopsoqIntersticialOficial = {
  id: string;
  /** Código da pergunta imediatamente após o interstício. */
  antesDeCodigo: string;
  /** Rótulo curto na UI (não é pergunta). */
  titulo: string;
  /** Texto exato do Formulário. */
  texto: string;
};

/**
 * Ordem = ordem de aparição no fluxo (antes das perguntas indicadas).
 */
export const COPSOQ_INTERSTICIAIS_OFICIAIS: readonly CopsoqIntersticialOficial[] =
  [
    {
      id: "antes-14a-vida-particular",
      antesDeCodigo: "14A",
      titulo: "Orientação",
      texto:
        "As próximas duas perguntas são sobre a forma como o seu trabalho afeta a sua vida particular e familiar.",
    },
    {
      id: "antes-15a-empresa",
      antesDeCodigo: "15A",
      titulo: "Orientação",
      texto:
        "As próximas quatro perguntas não são sobre o seu próprio trabalho, mas sobre a empresa em que você trabalha.",
    },
    {
      id: "antes-17-saude",
      antesDeCodigo: "17",
      titulo: "Orientação",
      texto:
        "As próximas cinco perguntas são sobre a sua própria saúde e bem-estar. Por favor, tente não distinguir entre sintomas que são causados pelo trabalho e sintomas que se devem a outras causas. Descreva como você está no geral. As perguntas são sobre a sua saúde e bem-estar nas últimas quatro semanas:",
    },
    {
      id: "antes-23-bullying",
      antesDeCodigo: "23",
      titulo: "Orientação",
      texto:
        "“Bullying” significa que uma pessoa é repetidamente exposta a tratamento desagradável ou degradante, do qual a vítima tem dificuldade para se defender.",
    },
  ] as const;

/** Códigos oficiais que possuem interstício imediatamente antes. */
export const COPSOQ_INTERSTICIAL_ANTES_DE_CODIGOS: readonly string[] =
  COPSOQ_INTERSTICIAIS_OFICIAIS.map((i) => i.antesDeCodigo);

/**
 * IDs de dimensão cujos textosIntroducao NÃO devem virar tela no portal
 * (não constam como bloco no Formulário).
 */
export const COPSOQ_INTERSTICIAIS_INVENTADOS_PROIBIDOS: readonly string[] = [
  "demandas-trabalho",
  "influencia-desenvolvimento",
  "significado-comprometimento",
  "relacoes-interpessoais",
  "lideranca",
  "interface-trabalho-individuo",
  "burnout-estresse",
  "comportamentos-ofensivos",
] as const;
