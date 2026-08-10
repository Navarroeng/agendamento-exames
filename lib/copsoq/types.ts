/**
 * Tipos do instrumento oficial COPSOQ II-Br (parametrizado).
 * Fonte: Formulário de Aplicação + Orientações oficiais.
 */

export type CopsoqDimensaoTipo = "RISCO" | "PROTECAO";

export type CopsoqEscalaId =
  | "frequencia"
  | "intensidade"
  | "satisfacao"
  | "saude"
  | "exposicao"
  | "impacto_vida_particular"
  | "fonte_exposicao";

export type CopsoqClassificacaoId =
  | "situacao_favoravel"
  | "risco_intermediario"
  | "risco_para_saude";

export type CopsoqAlternativa = {
  id: string;
  label: string;
  /** Pontuação oficial da alternativa (conforme formulário). */
  pontuacao: number;
  ordem: number;
};

export type CopsoqEscala = {
  id: CopsoqEscalaId;
  nome: string;
  alternativas: readonly CopsoqAlternativa[];
};

export type CopsoqDimensao = {
  id: string;
  nome: string;
  tipo: CopsoqDimensaoTipo;
  ordem: number;
  descricao: string;
  /** Texto da tela intermediária antes das perguntas desta dimensão. */
  textoIntroducao: string;
  entraNoCalculo: boolean;
};

export type CopsoqPergunta = {
  id: string;
  /** Código oficial: 1A, 1B, 13, 20... */
  codigo: string;
  /** Número da questão principal (1–23). */
  questaoPrincipal: number;
  dimensaoId: string;
  texto: string;
  tipoEscala: CopsoqEscalaId;
  ordem: number;
  obrigatoria: boolean;
  entraNoCalculo: boolean;
  /**
   * Quando true, a pontuação efetiva = maxEscala - pontuacaoAlternativa.
   * Ex.: 1B no formulário oficial.
   */
  pontuacaoInvertida: boolean;
  /** Ajuda/contexto opcional (ex.: definição de bullying). */
  textoAjuda?: string;
  /** Pergunta follow-up (ex.: "Se sim, de quem?"). */
  followUp?: {
    id: string;
    texto: string;
    tipoEscala: CopsoqEscalaId;
    multiplaEscolha: boolean;
    /** Exibir follow-up quando a resposta NÃO for este label. */
    exibirQuandoRespostaDiferenteDe: string;
  };
};

export type CopsoqInstrumento = {
  id: string;
  nome: string;
  versao: string;
  totalQuestoesPrincipais: number;
  totalPerguntasAvaliativas: number;
  dimensoes: readonly CopsoqDimensao[];
  escalas: readonly CopsoqEscala[];
  perguntas: readonly CopsoqPergunta[];
};

export type CopsoqFlowItem =
  | {
      type: "transicao";
      key: string;
      dimensao: CopsoqDimensao;
      primeiraPerguntaOrdem: number;
    }
  | {
      type: "pergunta";
      key: string;
      pergunta: CopsoqPergunta;
      dimensao: CopsoqDimensao;
      /** Índice 0-based entre as perguntas avaliativas do fluxo. */
      perguntaIndex: number;
      /** Número 1..N para progresso (apenas avaliativas). */
      numero: number;
    };
