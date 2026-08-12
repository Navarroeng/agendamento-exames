/**
 * Amplitude efetiva das pontuações impressas (pós-inversão de pergunta).
 * Usada para identificar o máximo da escala da dimensão (3 ou 4).
 *
 * A classificação do produto NÃO normaliza mais para escala comum —
 * ver escala-produto.ts / METODOLOGIA-PRODUTO.md.
 *
 * Não altera pontuações impressas do Formulário nem respostas gravadas.
 */

import { getCopsoqEscala } from "@/lib/copsoq/escalas";
import type { CopsoqPergunta } from "@/lib/copsoq/types";
import { perguntasCalculoDaDimensao } from "@/lib/copsoq-engine/dimensions";
import { maxPontuacaoEscala } from "@/lib/copsoq-engine/score";

/** @deprecated Classificação não usa mais escala comum. Mantido para helpers legados. */
export const COPSOQ_ESCALA_COMUM_MIN = 0;
/** @deprecated Classificação não usa mais escala comum. Mantido para helpers legados. */
export const COPSOQ_ESCALA_COMUM_MAX = 4;

export function minPontuacaoEscala(pergunta: CopsoqPergunta): number {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  if (!escala || escala.alternativas.length === 0) return 0;
  return Math.min(...escala.alternativas.map((a) => a.pontuacao));
}

/**
 * Amplitude efetiva possível da pontuação de uma pergunta
 * (após inversão configurável, se houver).
 */
export function amplitudeEfetivaPergunta(pergunta: CopsoqPergunta): {
  min: number;
  max: number;
} {
  const minImp = minPontuacaoEscala(pergunta);
  const maxImp = maxPontuacaoEscala(pergunta);
  if (!pergunta.pontuacaoInvertida) {
    return { min: minImp, max: maxImp };
  }
  // efetiva = maxImp - impressa → extremos trocados, amplitude preservada
  return { min: maxImp - maxImp, max: maxImp - minImp };
}

/**
 * Amplitude da dimensão = média das amplitudes efetivas das perguntas do cálculo.
 * Genérico para qualquer conjunto (0–2, 0–3, 0–4, 0–6, …).
 */
export function amplitudeEscalaDimensao(dimensaoId: string): {
  min: number;
  max: number;
} {
  const perguntas = perguntasCalculoDaDimensao(dimensaoId);
  if (perguntas.length === 0) {
    return { min: COPSOQ_ESCALA_COMUM_MIN, max: COPSOQ_ESCALA_COMUM_MAX };
  }
  let sumMin = 0;
  let sumMax = 0;
  for (const p of perguntas) {
    const amp = amplitudeEfetivaPergunta(p);
    sumMin += amp.min;
    sumMax += amp.max;
  }
  return {
    min: sumMin / perguntas.length,
    max: sumMax / perguntas.length,
  };
}

/**
 * Normaliza uma média bruta da dimensão para a escala comum do motor.
 *
 * fórmula: comumMin + (media − min) / (max − min) × (comumMax − comumMin)
 */
export function normalizarPontuacao(
  mediaObtida: number,
  minimoEscala: number,
  maximoEscala: number,
  comumMin: number = COPSOQ_ESCALA_COMUM_MIN,
  comumMax: number = COPSOQ_ESCALA_COMUM_MAX
): number {
  if (!Number.isFinite(mediaObtida)) return mediaObtida;
  if (!Number.isFinite(minimoEscala) || !Number.isFinite(maximoEscala)) {
    return mediaObtida;
  }
  if (maximoEscala === minimoEscala) {
    return comumMin;
  }
  const t = (mediaObtida - minimoEscala) / (maximoEscala - minimoEscala);
  return comumMin + t * (comumMax - comumMin);
}

/** Atalho: normaliza a média bruta de uma dimensão pelo id. */
export function normalizarMediaDimensao(
  dimensaoId: string,
  mediaBruta: number | null
): number | null {
  if (mediaBruta == null || Number.isNaN(mediaBruta)) return null;
  const { min, max } = amplitudeEscalaDimensao(dimensaoId);
  return normalizarPontuacao(mediaBruta, min, max);
}
