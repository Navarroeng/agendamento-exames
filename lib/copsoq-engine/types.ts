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
 * - Alternativas NÃO são convertidas 0–4→1–5.
 * - Médias brutas do Formulário são normalizadas para escala comum 0–4 (amplitude
 *   predominante) antes dos cortes 2,33/3,66 — equivalência de amplitudes distintas.
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
   * Média usada para classificação e exibição: já na escala comum do motor (0–4).
   * Para dimensões com amplitude 0–4, coincide com a média bruta.
   */
  media: number | null;
  /**
   * Média aritmética nas pontuações impressas do Formulário (antes da
   * normalização de amplitude). Null se média indisponível.
   */
  mediaBruta: number | null;
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
  "Formulário: pontuações impressas 0–4 (freq./intens./saúde/exposição) e 0–3 (satisfação/impacto). Orientações citam em trecho '1 a 5' e 'Intervalo (0 a 5)'.",
  "Motor: média bruta do Formulário é normalizada para escala comum 0–4 (amplitude predominante) antes dos cortes 2,33/3,66 — equivalência de amplitudes distintas, sem alterar o instrumento.",
  "Cortes de classificação oficiais (≤2,33 / 2,34–3,66 / >3,66) aplicados sobre a média já normalizada para 0–4.",
  "Risco geral agregado entre dimensões: não definido oficialmente — retorna null.",
  "Escore padronizado: não definido oficialmente — retorna null.",
  "Comportamentos ofensivos: opcionais, fora do cálculo quantitativo; só saída qualitativa.",
] as const;
