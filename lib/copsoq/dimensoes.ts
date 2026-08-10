import type { CopsoqDimensao } from "@/lib/copsoq/types";

/** Dimensões oficiais conforme PDF de Orientações COPSOQ II-Br. */
export const COPSOQ_DIMENSOES: readonly CopsoqDimensao[] = [
  {
    id: "demandas-trabalho",
    nome: "Demandas de Trabalho",
    tipo: "RISCO",
    ordem: 1,
    descricao:
      "Dimensão de risco associada a sobrecarga, ritmo e exigências emocionais do trabalho.",
    textoIntroducao:
      "As próximas perguntas são sobre as Demandas do seu trabalho.",
    entraNoCalculo: true,
  },
  {
    id: "influencia-desenvolvimento",
    nome: "Influência e possibilidade de desenvolvimento",
    tipo: "PROTECAO",
    ordem: 2,
    descricao:
      "Dimensão de proteção relacionada à influência nas decisões e ao aprendizado no trabalho.",
    textoIntroducao:
      "As próximas perguntas são sobre influência nas decisões e possibilidade de desenvolvimento no trabalho.",
    entraNoCalculo: true,
  },
  {
    id: "significado-comprometimento",
    nome: "Significado do trabalho e comprometimento",
    tipo: "PROTECAO",
    ordem: 3,
    descricao:
      "Dimensão de proteção relacionada ao significado do trabalho e ao comprometimento com o local de trabalho.",
    textoIntroducao:
      "As próximas perguntas são sobre o significado do seu trabalho e o comprometimento com o local de trabalho.",
    entraNoCalculo: true,
  },
  {
    id: "relacoes-interpessoais",
    nome: "Relações interpessoais",
    tipo: "PROTECAO",
    ordem: 4,
    descricao:
      "Dimensão de proteção relacionada à informação, reconhecimento, justiça e clareza de papéis.",
    textoIntroducao:
      "As próximas perguntas são sobre informação, reconhecimento, tratamento justo e clareza de objetivos no trabalho.",
    entraNoCalculo: true,
  },
  {
    id: "lideranca",
    nome: "Liderança",
    tipo: "PROTECAO",
    ordem: 5,
    descricao:
      "Dimensão de proteção relacionada à qualidade da liderança imediata.",
    textoIntroducao:
      "As próximas perguntas são sobre a Liderança — a relação com seu superior imediato.",
    entraNoCalculo: true,
  },
  {
    id: "interface-trabalho-individuo",
    nome: "Interface trabalho-indivíduo",
    tipo: "PROTECAO",
    ordem: 6,
    descricao:
      "Dimensão de proteção relacionada à satisfação geral com o trabalho.",
    textoIntroducao:
      "A próxima pergunta é sobre a sua satisfação com o trabalho como um todo.",
    entraNoCalculo: true,
  },
  {
    id: "conflitos-familia-trabalho",
    nome: "Conflitos família e trabalho",
    tipo: "RISCO",
    ordem: 7,
    descricao:
      "Dimensão de risco sobre o efeito do trabalho na vida particular e familiar.",
    textoIntroducao:
      "As próximas duas perguntas são sobre a forma como o seu trabalho afeta a sua vida particular e familiar.",
    entraNoCalculo: true,
  },
  {
    id: "valores-local-trabalho",
    nome: "Valores do local de trabalho",
    tipo: "PROTECAO",
    ordem: 8,
    descricao:
      "Dimensão de proteção relacionada à confiança e justiça na organização.",
    textoIntroducao:
      "As próximas quatro perguntas não são sobre o seu próprio trabalho, mas sobre a empresa em que você trabalha.",
    entraNoCalculo: true,
  },
  {
    id: "saude-geral",
    nome: "Saúde Geral",
    tipo: "PROTECAO",
    ordem: 9,
    descricao: "Dimensão de proteção sobre a percepção geral de saúde.",
    textoIntroducao:
      "As próximas perguntas são sobre a sua própria saúde e bem-estar. Por favor, tente não distinguir entre sintomas que são causados pelo trabalho e sintomas que se devem a outras causas. Descreva como você está no geral. As perguntas são sobre a sua saúde e bem-estar nas últimas quatro semanas:",
    entraNoCalculo: true,
  },
  {
    id: "burnout-estresse",
    nome: "Burnout e Estresse",
    tipo: "RISCO",
    ordem: 10,
    descricao:
      "Dimensão de risco sobre esgotamento físico/emocional, estresse e irritação.",
    textoIntroducao:
      "As próximas perguntas são sobre esgotamento, estresse e irritação nas últimas quatro semanas.",
    entraNoCalculo: true,
  },
  {
    id: "comportamentos-ofensivos",
    nome: "Comportamentos ofensivos",
    tipo: "RISCO",
    ordem: 11,
    descricao:
      "Dimensão de risco com análise separada. Obrigatória para resposta e não entra na média geral.",
    textoIntroducao:
      "As próximas perguntas são sobre exposição a comportamentos ofensivos no local de trabalho nos últimos 12 meses.",
    entraNoCalculo: false,
  },
] as const;
