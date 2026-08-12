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
 * - Metodologia do produto: classifica na escala impressa (0–3 ou 0–4) após inversão;
 *   faixas próprias (METODOLOGIA-PRODUTO.md) — não são cortes oficiais.
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
  motivo?: string;
};

export type CopsoqParticipacaoOperacional = {
  respondentes: number;
  base: number;
  percentual: number | null;
};

export type CopsoqDimensaoCalculoResultado = {
  id: string;
  nome: string;
  tipo: CopsoqDimensaoTipo;
  entraNoCalculo: boolean;
  /** Média na escala impressa (pós-inversão de pergunta). */
  media: number | null;
  /** Alias de media (compatibilidade com snapshots). */
  mediaBruta: number | null;
  /** Máximo da escala impressa da dimensão (3 ou 4). */
  maxEscalaFinal?: 3 | 4;
  escorePadronizado: number | null;
  classificacao: CopsoqClassificacaoResultado;
  respondentesValidos: number;
  respostasAusentes: number;
  perguntasEsperadas: number;
};

export type CopsoqComportamentosOfensivosQualitativo = {
  dimensaoId: string;
  nome: string;
  media: null;
  escorePadronizado: null;
  classificacao: CopsoqClassificacaoResultado;
  respondentesComAlgumaResposta: number;
  frequenciasPorPergunta: Record<string, Record<string, number>>;
};

export type CopsoqEngineResult = {
  participacao: CopsoqParticipacaoOperacional;
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
  "Metodologia do produto: classifica na escala impressa (0–4 ou 0–3) após inversão de pergunta; faixas próprias — ver METODOLOGIA-PRODUTO.md.",
  "Não utiliza os cortes 2,33/3,66 das Orientações nem conversões para 0–5 ou escala comum 0–4.",
  "Risco geral agregado entre dimensões: não definido oficialmente — retorna null.",
  "Escore padronizado: não definido oficialmente — retorna null.",
  "Comportamentos ofensivos: opcionais, fora do cálculo quantitativo; só saída qualitativa.",
] as const;
