/**
 * Questionário oficial da Pesquisa Psicossocial (40 perguntas).
 * Fonte: lista fornecida pelo produto — NÃO inventar, reordenar ou resumir textos.
 *
 * Dimensões: apenas para transições / organização / cálculo futuro.
 * A experiência do participante segue a numeração 01 → 40.
 */

export type CopsoqEscalaId =
  | "frequencia_5"
  | "impacto_4"
  | "saude_5"
  /** TODO: confirmar escala oficial da pergunta 25 (satisfação). */
  | "satisfacao_5_PENDENTE"
  /** TODO: confirmar escala oficial das perguntas 37–40 (exposição). */
  | "exposicao_sim_nao_PENDENTE";

export type CopsoqOpcao = {
  valor: string;
  label: string;
};

export type CopsoqDimensao = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  textoTransicao: string;
};

export type CopsoqPergunta = {
  id: string;
  /** Numeração oficial 1–40 (ordem do participante). */
  numero: number;
  dimensaoId: string;
  texto: string;
  ajuda?: string;
  escalaId: CopsoqEscalaId;
  /** true = escala ainda não confirmada oficialmente. */
  escalaPendente?: boolean;
};

export const COPSOQ_ESCALAS: Record<CopsoqEscalaId, readonly CopsoqOpcao[]> = {
  frequencia_5: [
    { valor: "1", label: "Sempre" },
    { valor: "2", label: "Frequentemente" },
    { valor: "3", label: "Às vezes" },
    { valor: "4", label: "Raramente" },
    { valor: "5", label: "Nunca" },
  ],
  impacto_4: [
    { valor: "1", label: "Sim, com certeza" },
    { valor: "2", label: "Sim, até certo ponto" },
    { valor: "3", label: "Sim, mas muito pouco" },
    { valor: "4", label: "Não, realmente não" },
  ],
  saude_5: [
    { valor: "1", label: "Excelente" },
    { valor: "2", label: "Muito boa" },
    { valor: "3", label: "Boa" },
    { valor: "4", label: "Razoável" },
    { valor: "5", label: "Ruim" },
  ],
  // Escala temporária — confirmar antes do cálculo de resultados.
  satisfacao_5_PENDENTE: [
    { valor: "1", label: "Muito satisfeito" },
    { valor: "2", label: "Satisfeito" },
    { valor: "3", label: "Nem satisfeito nem insatisfeito" },
    { valor: "4", label: "Insatisfeito" },
    { valor: "5", label: "Muito insatisfeito" },
  ],
  // Escala temporária — confirmar antes do cálculo de resultados.
  exposicao_sim_nao_PENDENTE: [
    { valor: "1", label: "Sim" },
    { valor: "2", label: "Não" },
  ],
} as const;

/** Dimensões internas (transições). Extensíveis. */
export const COPSOQ_DIMENSOES: readonly CopsoqDimensao[] = [
  {
    id: "dim-demandas",
    slug: "demandas",
    nome: "Demandas",
    ordem: 1,
    textoTransicao:
      "As próximas perguntas são sobre as Demandas do seu trabalho — ritmo, volume e exigências emocionais.",
  },
  {
    id: "dim-influencia-significado",
    slug: "influencia-desenvolvimento-significado",
    nome: "Influência, desenvolvimento e significado",
    ordem: 2,
    textoTransicao:
      "As próximas perguntas são sobre influência nas decisões, aprendizado e o significado do seu trabalho.",
  },
  {
    id: "dim-predibilidade-reconhecimento",
    slug: "predibilidade-reconhecimento-clareza",
    nome: "Predibilidade, reconhecimento e clareza",
    ordem: 3,
    textoTransicao:
      "As próximas perguntas são sobre informação, reconhecimento, tratamento justo e clareza de objetivos no trabalho.",
  },
  {
    id: "dim-lideranca",
    slug: "lideranca",
    nome: "Liderança",
    ordem: 4,
    textoTransicao:
      "As próximas perguntas são sobre Liderança — a relação com seu superior imediato.",
  },
  {
    id: "dim-satisfacao",
    slug: "satisfacao-no-trabalho",
    nome: "Satisfação no trabalho",
    ordem: 5,
    textoTransicao:
      "A próxima pergunta é sobre a sua satisfação com o trabalho como um todo.",
  },
  {
    id: "dim-conflito",
    slug: "conflito-trabalho-familia",
    nome: "Conflito Trabalho x Família",
    ordem: 6,
    textoTransicao:
      "As próximas perguntas são sobre a forma como o seu trabalho afeta a sua vida particular e familiar.",
  },
  {
    id: "dim-confianca-justica",
    slug: "confianca-e-justica",
    nome: "Confiança e justiça",
    ordem: 7,
    textoTransicao:
      "As próximas perguntas são sobre confiança e justiça no local de trabalho.",
  },
  {
    id: "dim-saude",
    slug: "saude-e-bem-estar",
    nome: "Saúde e Bem-estar",
    ordem: 8,
    textoTransicao:
      "As próximas perguntas são sobre a sua própria saúde e bem-estar. Por favor, descreva como você está no geral.",
  },
  {
    id: "dim-ofensivos",
    slug: "comportamentos-ofensivos",
    nome: "Comportamentos ofensivos",
    ordem: 9,
    textoTransicao:
      "As próximas perguntas são sobre situações de exposição a comportamentos ofensivos no local de trabalho nos últimos 12 meses.",
  },
] as const;

const Q = (
  numero: number,
  dimensaoId: string,
  texto: string,
  escalaId: CopsoqEscalaId,
  opts?: { ajuda?: string; escalaPendente?: boolean }
): CopsoqPergunta => ({
  id: `q-${String(numero).padStart(2, "0")}`,
  numero,
  dimensaoId,
  texto,
  escalaId,
  ajuda: opts?.ajuda,
  escalaPendente: opts?.escalaPendente,
});

/**
 * 40 perguntas oficiais — ordem obrigatória 01 → 40.
 * Textos exatamente como fornecidos (não alterar).
 */
export const COPSOQ_PERGUNTAS: readonly CopsoqPergunta[] = [
  Q(1, "dim-demandas", "Você atrasa a entrega do seu trabalho?", "frequencia_5"),
  Q(
    2,
    "dim-demandas",
    "O tempo para realizar suas tarefas é suficiente?",
    "frequencia_5"
  ),
  Q(
    3,
    "dim-demandas",
    "É necessário manter um ritmo acelerado no trabalho?",
    "frequencia_5"
  ),
  Q(
    4,
    "dim-demandas",
    "Você trabalha em um ritmo acelerado ao longo da sua jornada?",
    "frequencia_5"
  ),
  Q(
    5,
    "dim-demandas",
    "Seu trabalho coloca você em situações emocionalmente desgastantes?",
    "frequencia_5"
  ),
  Q(
    6,
    "dim-demandas",
    "Você tem que lidar com problemas pessoais de outras pessoas como parte do seu trabalho?",
    "frequencia_5"
  ),

  Q(
    7,
    "dim-influencia-significado",
    "Você tem um alto grau de influência nas decisões sobre o seu trabalho?",
    "frequencia_5"
  ),
  Q(
    8,
    "dim-influencia-significado",
    "Você pode interferir na quantidade de trabalho atribuída a você?",
    "frequencia_5"
  ),
  Q(
    9,
    "dim-influencia-significado",
    "Você tem a possibilidade de aprender coisas novas através do seu trabalho?",
    "frequencia_5"
  ),
  Q(
    10,
    "dim-influencia-significado",
    "Seu trabalho exige que você tome iniciativas?",
    "frequencia_5"
  ),
  Q(
    11,
    "dim-influencia-significado",
    "Seu trabalho é significativo?",
    "frequencia_5"
  ),
  Q(
    12,
    "dim-influencia-significado",
    "Você sente que o trabalho que você faz é importante?",
    "frequencia_5"
  ),
  Q(
    13,
    "dim-influencia-significado",
    "Você sente que o seu local de trabalho é importante para você?",
    "frequencia_5"
  ),
  Q(
    14,
    "dim-influencia-significado",
    "Você recomendaria a um amigo que candidatasse a uma vaga no seu local de trabalho?",
    "frequencia_5"
  ),

  Q(
    15,
    "dim-predibilidade-reconhecimento",
    "Você é informado antecipadamente sobre decisões importantes, mudanças ou planos para o futuro?",
    "frequencia_5"
  ),
  Q(
    16,
    "dim-predibilidade-reconhecimento",
    "Você recebe toda informação necessária para fazer bem o seu trabalho?",
    "frequencia_5"
  ),
  Q(
    17,
    "dim-predibilidade-reconhecimento",
    "O seu trabalho é reconhecido e valorizado pelos seus superiores?",
    "frequencia_5"
  ),
  Q(
    18,
    "dim-predibilidade-reconhecimento",
    "Você é tratado de forma justa no seu local de trabalho?",
    "frequencia_5"
  ),
  Q(
    19,
    "dim-predibilidade-reconhecimento",
    "O seu trabalho tem objetivos/metas claros(as)?",
    "frequencia_5"
  ),
  Q(
    20,
    "dim-predibilidade-reconhecimento",
    "Você sabe exatamente o que se espera de você no trabalho?",
    "frequencia_5"
  ),

  Q(
    21,
    "dim-lideranca",
    "Você diria que o seu superior imediato dá alta prioridade para a satisfação com o trabalho?",
    "frequencia_5"
  ),
  Q(
    22,
    "dim-lideranca",
    "Você diria que o seu superior imediato é bom no planejamento do trabalho?",
    "frequencia_5"
  ),
  Q(
    23,
    "dim-lideranca",
    "Com que frequência o seu superior imediato está disposto a ouvir os seus problemas no trabalho?",
    "frequencia_5"
  ),
  Q(
    24,
    "dim-lideranca",
    "Com que frequência você recebe ajuda ou suporte do seu superior imediato?",
    "frequencia_5"
  ),

  Q(
    25,
    "dim-satisfacao",
    "Qual o seu nível de satisfação com o seu trabalho como um todo considerando todos os aspectos?",
    "satisfacao_5_PENDENTE",
    { escalaPendente: true }
  ),

  Q(
    26,
    "dim-conflito",
    "Você sente que o seu trabalho consome tanto sua energia que ele tem um efeito negativo na sua vida particular?",
    "impacto_4",
    {
      ajuda:
        "Essa pergunta é sobre a forma como o seu trabalho afeta a sua vida particular e familiar.",
    }
  ),
  Q(
    27,
    "dim-conflito",
    "Você sente que o seu trabalho ocupa tanto tempo que ele tem um efeito negativo da sua vida particular?",
    "impacto_4"
  ),

  Q(
    28,
    "dim-confianca-justica",
    "Você pode confiar nas informações que vêm dos seus superiores?",
    "frequencia_5"
  ),
  Q(
    29,
    "dim-confianca-justica",
    "Os seus superiores confiam que os funcionários farão bem seu trabalho?",
    "frequencia_5"
  ),
  Q(
    30,
    "dim-confianca-justica",
    "Os conflitos são resolvidos de forma justa?",
    "frequencia_5"
  ),
  Q(
    31,
    "dim-confianca-justica",
    "O trabalho é distribuído de forma justa?",
    "frequencia_5"
  ),

  Q(32, "dim-saude", "Em geral, você diria que a sua saúde é:", "saude_5"),
  Q(
    33,
    "dim-saude",
    "Com que frequência você tem se sentido fisicamente esgotado?",
    "frequencia_5"
  ),
  Q(
    34,
    "dim-saude",
    "Com que frequência você tem se sentido emocionalmente esgotado?",
    "frequencia_5"
  ),
  Q(
    35,
    "dim-saude",
    "Com que frequência você tem se sentido estressado?",
    "frequencia_5"
  ),
  Q(
    36,
    "dim-saude",
    "Com que frequência você tem se sentido irritado?",
    "frequencia_5"
  ),

  Q(
    37,
    "dim-ofensivos",
    "Você foi exposto a atenção sexual indesejada no seu local de trabalho durante os últimos 12 meses?",
    "exposicao_sim_nao_PENDENTE",
    { escalaPendente: true }
  ),
  Q(
    38,
    "dim-ofensivos",
    "Você foi exposto a ameaças de violência no seu local de trabalho nos últimos 12 meses?",
    "exposicao_sim_nao_PENDENTE",
    { escalaPendente: true }
  ),
  Q(
    39,
    "dim-ofensivos",
    "Você foi exposto a violência física em seu local de trabalho durante os últimos 12 meses?",
    "exposicao_sim_nao_PENDENTE",
    { escalaPendente: true }
  ),
  Q(
    40,
    "dim-ofensivos",
    "Você foi exposto a bullying no seu local de trabalho durante os últimos 12 meses?",
    "exposicao_sim_nao_PENDENTE",
    { escalaPendente: true }
  ),
];

export const COPSOQ_TOTAL_PERGUNTAS = 40;

export type CopsoqFlowItem =
  | {
      type: "transicao";
      key: string;
      dimensao: CopsoqDimensao;
      primeiraPerguntaIndex: number;
    }
  | {
      type: "pergunta";
      key: string;
      pergunta: CopsoqPergunta;
      dimensao: CopsoqDimensao;
      perguntaIndex: number;
      numero: number;
    };

export function getDimensaoById(id: string): CopsoqDimensao | undefined {
  return COPSOQ_DIMENSOES.find((d) => d.id === id);
}

/** Ordem oficial: numero 1 → 40 (não reordenar por dimensão). */
export function getPerguntasOrdenadas(): CopsoqPergunta[] {
  return [...COPSOQ_PERGUNTAS].sort((a, b) => a.numero - b.numero);
}

/**
 * Fluxo: transição ao mudar de dimensão + perguntas na ordem 01→40.
 * Transições NÃO entram na contagem de perguntas.
 */
export function buildCopsoqFlow(): {
  items: CopsoqFlowItem[];
  totalPerguntas: number;
} {
  const perguntas = getPerguntasOrdenadas();
  const items: CopsoqFlowItem[] = [];
  let perguntaIndex = 0;
  let dimAnterior: string | null = null;

  for (const pergunta of perguntas) {
    const dimensao = getDimensaoById(pergunta.dimensaoId);
    if (!dimensao) {
      throw new Error(
        `Dimensão não encontrada para pergunta ${pergunta.numero}: ${pergunta.dimensaoId}`
      );
    }

    if (pergunta.dimensaoId !== dimAnterior) {
      items.push({
        type: "transicao",
        key: `t-${dimensao.id}-antes-q${pergunta.numero}`,
        dimensao,
        primeiraPerguntaIndex: perguntaIndex,
      });
      dimAnterior = pergunta.dimensaoId;
    }

    items.push({
      type: "pergunta",
      key: pergunta.id,
      pergunta,
      dimensao,
      perguntaIndex,
      numero: pergunta.numero,
    });
    perguntaIndex += 1;
  }

  return { items, totalPerguntas: perguntas.length };
}

export function getOpcoesEscala(
  escalaId: CopsoqEscalaId
): readonly CopsoqOpcao[] {
  return COPSOQ_ESCALAS[escalaId];
}
