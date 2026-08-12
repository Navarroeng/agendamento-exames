/**
 * Tipos do Motor de Cálculo COPSOQ II-Br.
 *
 * Fontes oficiais (únicas):
 * - COPSOQ II - Formulário de Aplicação
 * - COPSOQ II - Orientações v2
 *
 * Divergência documentada:
 * - Formulário usa pontuações 0–4 (e 0–3 em algumas escalas).
 * - Orientações citam em um trecho “respostas de 1 a 5” e faixas “Intervalo (0 a 5)”.
 * - Metodologia do produto: conversão linear 0–4→0–5 e 0–3→0–4 após inversão;
 *   classificação por faixas próprias (METODOLOGIA-PRODUTO.md) — não são cortes oficiais.
 */

import type {
  CopsoqClassificacaoId,
  CopsoqDimensaoTipo,
} from "@/lib/copsoq/types";

/** Respostas de um respondente: perguntaId → alternativaId (ou label). */
export type CopsoqRespostasRespondente = Record<string, string>;

export type CopsoqClassificacaoResultadoId =
  | CopsoqClassificacaoId
  | "classificacao_nao_definida";

export type CopsoqClassificacaoResultado = {
  id: CopsoqClassificacaoResultadoId;
  label: string;
  interpretacao: string;
  /** Motivo quando id === classificacao_nao_definida. */
  motivo?: string;
};

export type CopsoqDimensaoCalculoResultado = {
  id: string;
  nome: string;
  tipo: CopsoqDimensaoTipo;
  entraNoCalculo: boolean;
  /**
   * Média na escala final do produto (0–4 ou 0–5), usada na classificação.
   */
  media: number | null;
  /**
   * Média aritmética nas pontuações impressas do Formulário (após inversão,
   * antes da conversão para escala final).
   */
  mediaBruta: number | null;
  /** Máximo da escala final do produto para esta dimensão (4 ou 5). */
  maxEscalaFinal?: 4 | 5;
  /**
   * Não definido nos documentos oficiais anexados.
   * Sempre null até haver fórmula oficial.
   */
  escorePadronizado: null;
  classificacao: CopsoqClassificacaoResultado;
  respondentesValidos: number;
  respostasAusentes: number;
  perguntasEsperadas: number;
};

export type CopsoqComportamentosOfensivosQualitativo = {
  dimensaoId: "comportamentos-ofensivos";
  nome: string;
  /** Sem média/classificação — apenas preservação para análise qualitativa futura. */
  media: null;
  escorePadronizado: null;
  classificacao: CopsoqClassificacaoResultado;
  respondentesComAlgumaResposta: number;
  /** Contagens brutas por pergunta (alternativaId → n). */
  frequenciasPorPergunta: Record<string, Record<string, number>>;
};

export type CopsoqParticipacaoOperacional = {
  respondentes: number;
  base: number;
  percentual: number | null;
};

export type CopsoqEngineResult = {
  /** Métrica operacional (não é regra COPSOQ). */
  participacao: CopsoqParticipacaoOperacional;
  /**
   * Agregado global entre dimensões: fórmula oficial inexistente nos PDFs.
   * Orientações pedem análise separada por fator.
   */
  riscoGeral: null;
  dimensoes: CopsoqDimensaoCalculoResultado[];
  comportamentosOfensivos: CopsoqComportamentosOfensivosQualitativo;
  /** Notas de limitações/divergências documentais aplicadas nesta execução. */
  limitacoes: string[];
};

export type CopsoqEngineInput = {
  /**
   * Uma entrada por respondente que concluiu (ou conjunto completo).
   * Cada mapa: perguntaId → alternativaId|label.
   */
  respondentes: CopsoqRespostasRespondente[];
  /** Base para participação operacional (ex.: cadastrados). Default = respondentes.length. */
  baseParticipacao?: number;
};

/** Documentação embutida das divergências Formulário × Orientações. */
export const COPSOQ_ENGINE_DIVERGENCIAS = [
  "Formulário: pontuações impressas 0–4 (5 alternativas) e 0–3 (4 alternativas).",
  "Metodologia do produto: conversão linear 0–4→0–5 (5 alts) e 0–3→0–4 (4 alts) após inversão de pergunta; classificação por faixas próprias — ver METODOLOGIA-PRODUTO.md.",
  "Não utiliza os cortes 2,33/3,66 das Orientações nem os cortes 1,33/2,66 da metodologia anterior do produto.",
  "Risco geral agregado entre dimensões: não definido oficialmente — retorna null.",
  "Escore padronizado: não definido oficialmente — retorna null.",
  "Comportamentos ofensivos: opcionais, fora do cálculo quantitativo; só saída qualitativa.",
] as const;
