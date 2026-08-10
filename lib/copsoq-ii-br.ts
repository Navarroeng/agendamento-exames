/**
 * Estrutura do questionário COPSOQ II-Br (Copenhagen Psychosocial Questionnaire).
 * Dimensões são entidades extensíveis — novas podem ser adicionadas sem alterar o portal.
 *
 * Conteúdo em português alinhado às dimensões do instrumento, para o fluxo do portal.
 * Em produção, o banco oficial licenciado do COPSOQ II-Br deve alimentar estas entidades.
 */

export type CopsoqEscalaId = "frequencia_5" | "impacto_4" | "saude_5";

export type CopsoqOpcao = {
  valor: string;
  label: string;
};

export type CopsoqDimensao = {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  /** Texto da tela intermediária antes das perguntas desta dimensão. */
  textoTransicao: string;
};

export type CopsoqPergunta = {
  id: string;
  dimensaoId: string;
  ordem: number;
  texto: string;
  /** Esclarecimento opcional abaixo da pergunta. */
  ajuda?: string;
  escalaId: CopsoqEscalaId;
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
} as const;

/** Dimensões do sistema — extensíveis. */
export const COPSOQ_DIMENSOES: readonly CopsoqDimensao[] = [
  {
    id: "dim-demandas",
    slug: "demandas",
    nome: "Demandas",
    ordem: 1,
    textoTransicao:
      "As próximas perguntas são sobre as Demandas do seu trabalho — ritmo, volume e pressão do dia a dia.",
  },
  {
    id: "dim-organizacao",
    slug: "organizacao-do-trabalho",
    nome: "Organização do Trabalho",
    ordem: 2,
    textoTransicao:
      "As próximas perguntas são sobre a Organização do Trabalho — clareza de papéis, autonomia e condições para executar suas tarefas.",
  },
  {
    id: "dim-lideranca",
    slug: "lideranca",
    nome: "Liderança",
    ordem: 3,
    textoTransicao:
      "As próximas perguntas são sobre Liderança — a relação com sua chefia e o suporte que você recebe no trabalho.",
  },
  {
    id: "dim-apoio",
    slug: "apoio-social",
    nome: "Apoio Social",
    ordem: 4,
    textoTransicao:
      "As próximas perguntas são sobre Apoio Social — a colaboração e o suporte entre colegas de trabalho.",
  },
  {
    id: "dim-justica",
    slug: "justica-organizacional",
    nome: "Justiça Organizacional",
    ordem: 5,
    textoTransicao:
      "As próximas perguntas não são apenas sobre o seu próprio trabalho, mas sobre a Justiça Organizacional na empresa em que você trabalha.",
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
    id: "dim-saude",
    slug: "saude-e-bem-estar",
    nome: "Saúde e Bem-estar",
    ordem: 7,
    textoTransicao:
      "As próximas perguntas são sobre a sua própria saúde e bem-estar. Descreva como você está no geral nas últimas quatro semanas, sem tentar distinguir se os sintomas vêm do trabalho ou de outras causas.",
  },
] as const;

const Q = (
  id: string,
  dimensaoId: string,
  ordem: number,
  texto: string,
  escalaId: CopsoqEscalaId,
  ajuda?: string
): CopsoqPergunta => ({ id, dimensaoId, ordem, texto, escalaId, ajuda });

/**
 * Itens do questionário (protótipo estruturado por dimensão).
 * Ordem global = ordem das dimensões + ordem dentro da dimensão.
 */
export const COPSOQ_PERGUNTAS: readonly CopsoqPergunta[] = [
  // Demandas
  Q("q-dem-01", "dim-demandas", 1, "Você tem que trabalhar muito rápido?", "frequencia_5"),
  Q("q-dem-02", "dim-demandas", 2, "O tempo para realizar suas tarefas é suficiente?", "frequencia_5"),
  Q("q-dem-03", "dim-demandas", 3, "Você atrasa a entrega do seu trabalho?", "frequencia_5"),
  Q(
    "q-dem-04",
    "dim-demandas",
    4,
    "Você fica sem tempo para fazer pausas?",
    "frequencia_5"
  ),
  Q(
    "q-dem-05",
    "dim-demandas",
    5,
    "Você se sente sobrecarregado(a) pelas demandas do trabalho?",
    "frequencia_5"
  ),
  Q(
    "q-dem-06",
    "dim-demandas",
    6,
    "Seu trabalho exige que você se concentre por longos períodos?",
    "frequencia_5"
  ),

  // Organização do Trabalho
  Q(
    "q-org-01",
    "dim-organizacao",
    1,
    "Você tem clareza sobre quais são as suas responsabilidades no trabalho?",
    "frequencia_5"
  ),
  Q(
    "q-org-02",
    "dim-organizacao",
    2,
    "Você consegue influenciar a quantidade de trabalho que lhe é atribuída?",
    "frequencia_5"
  ),
  Q(
    "q-org-03",
    "dim-organizacao",
    3,
    "Você tem autonomia para decidir como realizar suas tarefas?",
    "frequencia_5"
  ),
  Q(
    "q-org-04",
    "dim-organizacao",
    4,
    "Você recebe informações suficientes para fazer bem o seu trabalho?",
    "frequencia_5"
  ),
  Q(
    "q-org-05",
    "dim-organizacao",
    5,
    "Seu trabalho está bem organizado?",
    "frequencia_5"
  ),
  Q(
    "q-org-06",
    "dim-organizacao",
    6,
    "Você sente que seu trabalho tem propósito e significado?",
    "frequencia_5"
  ),

  // Liderança
  Q(
    "q-lid-01",
    "dim-lideranca",
    1,
    "Com que frequência você recebe ajuda e suporte do seu superior imediato?",
    "frequencia_5"
  ),
  Q(
    "q-lid-02",
    "dim-lideranca",
    2,
    "Seu superior imediato valoriza o trabalho que você realiza?",
    "frequencia_5"
  ),
  Q(
    "q-lid-03",
    "dim-lideranca",
    3,
    "Seu superior imediato escuta você quando você tem algo a dizer?",
    "frequencia_5"
  ),
  Q(
    "q-lid-04",
    "dim-lideranca",
    4,
    "Você recebe feedback claro sobre o seu desempenho?",
    "frequencia_5"
  ),
  Q(
    "q-lid-05",
    "dim-lideranca",
    5,
    "Seu superior imediato planeja bem o trabalho da equipe?",
    "frequencia_5"
  ),

  // Apoio Social
  Q(
    "q-apo-01",
    "dim-apoio",
    1,
    "Com que frequência você recebe ajuda e suporte dos seus colegas?",
    "frequencia_5"
  ),
  Q(
    "q-apo-02",
    "dim-apoio",
    2,
    "Há um bom espírito de colaboração entre os colegas?",
    "frequencia_5"
  ),
  Q(
    "q-apo-03",
    "dim-apoio",
    3,
    "Você se sente parte de uma comunidade no trabalho?",
    "frequencia_5"
  ),
  Q(
    "q-apo-04",
    "dim-apoio",
    4,
    "Você pode contar com os colegas quando precisa?",
    "frequencia_5"
  ),
  Q(
    "q-apo-05",
    "dim-apoio",
    5,
    "O clima entre os colegas é de respeito mútuo?",
    "frequencia_5"
  ),

  // Justiça Organizacional
  Q(
    "q-jus-01",
    "dim-justica",
    1,
    "Os conflitos são resolvidos de forma justa na empresa?",
    "frequencia_5"
  ),
  Q(
    "q-jus-02",
    "dim-justica",
    2,
    "O trabalho é distribuído de forma justa?",
    "frequencia_5"
  ),
  Q(
    "q-jus-03",
    "dim-justica",
    3,
    "Você é tratado(a) com respeito pela empresa?",
    "frequencia_5"
  ),
  Q(
    "q-jus-04",
    "dim-justica",
    4,
    "As decisões importantes são comunicadas de forma transparente?",
    "frequencia_5"
  ),
  Q(
    "q-jus-05",
    "dim-justica",
    5,
    "Você confia na forma como a empresa trata as pessoas?",
    "frequencia_5"
  ),

  // Conflito Trabalho x Família
  Q(
    "q-con-01",
    "dim-conflito",
    1,
    "Você sente que o seu trabalho consome tanto sua energia que ele tem um efeito negativo na sua vida particular?",
    "impacto_4",
    "Essa pergunta é sobre a forma como o seu trabalho afeta a sua vida particular e familiar."
  ),
  Q(
    "q-con-02",
    "dim-conflito",
    2,
    "O trabalho exige tanto do seu tempo que isso prejudica sua vida particular?",
    "impacto_4"
  ),
  Q(
    "q-con-03",
    "dim-conflito",
    3,
    "Você consegue conciliar as exigências do trabalho com sua vida pessoal?",
    "frequencia_5"
  ),
  Q(
    "q-con-04",
    "dim-conflito",
    4,
    "Você leva preocupações do trabalho para casa?",
    "frequencia_5"
  ),

  // Saúde e Bem-estar
  Q(
    "q-sau-01",
    "dim-saude",
    1,
    "Em geral, como você avalia a sua saúde?",
    "saude_5"
  ),
  Q(
    "q-sau-02",
    "dim-saude",
    2,
    "Nas últimas quatro semanas, você se sentiu esgotado(a)?",
    "frequencia_5"
  ),
  Q(
    "q-sau-03",
    "dim-saude",
    3,
    "Nas últimas quatro semanas, você teve dificuldade para dormir?",
    "frequencia_5"
  ),
  Q(
    "q-sau-04",
    "dim-saude",
    4,
    "Nas últimas quatro semanas, você se sentiu tenso(a) ou nervoso(a)?",
    "frequencia_5"
  ),
  Q(
    "q-sau-05",
    "dim-saude",
    5,
    "Nas últimas quatro semanas, você se sentiu com energia para enfrentar o dia?",
    "frequencia_5"
  ),
  Q(
    "q-sau-06",
    "dim-saude",
    6,
    "Nas últimas quatro semanas, você se sentiu triste ou desanimado(a)?",
    "frequencia_5"
  ),
];

export type CopsoqFlowItem =
  | {
      type: "transicao";
      key: string;
      dimensao: CopsoqDimensao;
      /** Índice 0-based da primeira pergunta desta dimensão. */
      primeiraPerguntaIndex: number;
    }
  | {
      type: "pergunta";
      key: string;
      pergunta: CopsoqPergunta;
      dimensao: CopsoqDimensao;
      /** Índice 0-based na lista de perguntas. */
      perguntaIndex: number;
      numero: number;
    };

export function getDimensaoById(id: string): CopsoqDimensao | undefined {
  return COPSOQ_DIMENSOES.find((d) => d.id === id);
}

export function getPerguntasOrdenadas(): CopsoqPergunta[] {
  const dimOrder = new Map(COPSOQ_DIMENSOES.map((d) => [d.id, d.ordem]));
  return [...COPSOQ_PERGUNTAS].sort((a, b) => {
    const da = dimOrder.get(a.dimensaoId) ?? 999;
    const db = dimOrder.get(b.dimensaoId) ?? 999;
    if (da !== db) return da - db;
    return a.ordem - b.ordem;
  });
}

/** Monta o fluxo linear: transição da dimensão → perguntas da dimensão. */
export function buildCopsoqFlow(): {
  items: CopsoqFlowItem[];
  totalPerguntas: number;
} {
  const perguntas = getPerguntasOrdenadas();
  const items: CopsoqFlowItem[] = [];
  let perguntaIndex = 0;
  let numero = 0;

  for (const dim of [...COPSOQ_DIMENSOES].sort((a, b) => a.ordem - b.ordem)) {
    const daDim = perguntas.filter((p) => p.dimensaoId === dim.id);
    if (daDim.length === 0) continue;

    items.push({
      type: "transicao",
      key: `t-${dim.id}`,
      dimensao: dim,
      primeiraPerguntaIndex: perguntaIndex,
    });

    for (const pergunta of daDim) {
      numero += 1;
      items.push({
        type: "pergunta",
        key: pergunta.id,
        pergunta,
        dimensao: dim,
        perguntaIndex,
        numero,
      });
      perguntaIndex += 1;
    }
  }

  return { items, totalPerguntas: perguntas.length };
}

export function getOpcoesEscala(escalaId: CopsoqEscalaId): readonly CopsoqOpcao[] {
  return COPSOQ_ESCALAS[escalaId];
}
