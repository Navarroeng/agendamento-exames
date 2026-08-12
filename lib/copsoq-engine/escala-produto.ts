/**
 * Escala final da metodologia do produto (não é regra oficial COPSOQ).
 *
 * - Perguntas com 5 alternativas (impressas 0–4) → escala final 0–5
 * - Perguntas com 4 alternativas (impressas 0–3) → escala final 0–4
 *
 * Conversão linear após pontuação efetiva (já com inversão de pergunta, se houver).
 */

import { getCopsoqEscala } from "@/lib/copsoq/escalas";
import type { CopsoqPergunta } from "@/lib/copsoq/types";
import { perguntasCalculoDaDimensao } from "@/lib/copsoq-engine/dimensions";
import { amplitudeEfetivaPergunta } from "@/lib/copsoq-engine/scale-normalize";

export type EscalaFinalProduto = 4 | 5;

/**
 * Número de alternativas avaliativas da escala da pergunta
 * (não confundir com quantidade de perguntas da dimensão).
 */
export function numeroAlternativasPergunta(pergunta: CopsoqPergunta): number {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  return escala?.alternativas.length ?? 0;
}

/**
 * Escala final de destino da pergunta (metodologia do produto).
 * 5 alternativas → 0–5; 4 alternativas → 0–4.
 */
export function escalaFinalDestinoPergunta(
  pergunta: CopsoqPergunta
): EscalaFinalProduto {
  const n = numeroAlternativasPergunta(pergunta);
  if (n === 5) return 5;
  if (n === 4) return 4;
  throw new Error(
    `Pergunta ${pergunta.codigo}: escala com ${n} alternativas não mapeada (esperado 4 ou 5).`
  );
}

/**
 * valor_convertido = (valor − minOrig) / (maxOrig − minOrig) × maxDest
 * (minDest = 0).
 */
export function converterParaEscalaFinal(
  valorOriginal: number,
  minimoOriginal: number,
  maximoOriginal: number,
  maximoDestino: number
): number {
  if (!Number.isFinite(valorOriginal)) return valorOriginal;
  if (maximoOriginal === minimoOriginal) return 0;
  const t =
    (valorOriginal - minimoOriginal) / (maximoOriginal - minimoOriginal);
  return t * maximoDestino;
}

/** Converte pontuação efetiva (pós-inversão) para a escala final da pergunta. */
export function converterPontuacaoEfetivaParaEscalaFinal(
  pergunta: CopsoqPergunta,
  pontuacaoEfetiva: number
): number {
  const amp = amplitudeEfetivaPergunta(pergunta);
  const maxDest = escalaFinalDestinoPergunta(pergunta);
  return converterParaEscalaFinal(
    pontuacaoEfetiva,
    amp.min,
    amp.max,
    maxDest
  );
}

/**
 * Escala final homogênea da dimensão.
 * Se misturar 0–4 e 0–5, lança erro (não harmoniza silenciosamente).
 */
export function escalaFinalDimensao(dimensaoId: string): EscalaFinalProduto {
  const perguntas = perguntasCalculoDaDimensao(dimensaoId);
  if (perguntas.length === 0) {
    throw new Error(`Dimensão ${dimensaoId}: sem perguntas de cálculo.`);
  }
  const destinos = Array.from(
    new Set(perguntas.map((p) => escalaFinalDestinoPergunta(p)))
  );
  if (destinos.length !== 1) {
    throw new Error(
      `Dimensão ${dimensaoId}: mistura escalas finais (${destinos.join(", ")}). Harmonização não definida.`
    );
  }
  return destinos[0]!;
}
