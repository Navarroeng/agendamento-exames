/**
 * Escala impressa da dimensão — metodologia do produto (não é regra oficial COPSOQ).
 *
 * - Perguntas com 5 alternativas (pontuações 0–4) → escala da dimensão 0–4
 * - Perguntas com 4 alternativas (pontuações 0–3) → escala da dimensão 0–3
 *
 * Sem conversão/normalização para classificação: usa a pontuação efetiva
 * (já com inversão de pergunta, se houver).
 */

import { getCopsoqEscala } from "@/lib/copsoq/escalas";
import type { CopsoqPergunta } from "@/lib/copsoq/types";
import { perguntasCalculoDaDimensao } from "@/lib/copsoq-engine/dimensions";
import { amplitudeEfetivaPergunta } from "@/lib/copsoq-engine/scale-normalize";

export type EscalaDimensaoProduto = 3 | 4;

/** @deprecated Use EscalaDimensaoProduto (3 | 4). */
export type EscalaFinalProduto = EscalaDimensaoProduto;

/**
 * Número de alternativas avaliativas da escala da pergunta
 * (não confundir com quantidade de perguntas da dimensão).
 */
export function numeroAlternativasPergunta(pergunta: CopsoqPergunta): number {
  const escala = getCopsoqEscala(pergunta.tipoEscala);
  return escala?.alternativas.length ?? 0;
}

/**
 * Máximo da escala impressa da pergunta (pós-inversão a amplitude é a mesma).
 * 5 alternativas → 4; 4 alternativas → 3.
 */
export function maxEscalaImpressaPergunta(
  pergunta: CopsoqPergunta
): EscalaDimensaoProduto {
  const amp = amplitudeEfetivaPergunta(pergunta);
  if (amp.max === 4) return 4;
  if (amp.max === 3) return 3;
  throw new Error(
    `Pergunta ${pergunta.codigo}: máximo impresso ${amp.max} não mapeado (esperado 3 ou 4).`
  );
}

/** @deprecated Alias de maxEscalaImpressaPergunta. */
export function escalaFinalDestinoPergunta(
  pergunta: CopsoqPergunta
): EscalaDimensaoProduto {
  return maxEscalaImpressaPergunta(pergunta);
}

/**
 * Escala homogênea da dimensão (máximo impresso).
 * Se misturar 0–3 e 0–4, lança erro (não harmoniza silenciosamente).
 */
export function escalaDimensaoProduto(
  dimensaoId: string
): EscalaDimensaoProduto {
  const perguntas = perguntasCalculoDaDimensao(dimensaoId);
  if (perguntas.length === 0) {
    throw new Error(`Dimensão ${dimensaoId}: sem perguntas de cálculo.`);
  }
  const destinos = Array.from(
    new Set(perguntas.map((p) => maxEscalaImpressaPergunta(p)))
  );
  if (destinos.length !== 1) {
    throw new Error(
      `Dimensão ${dimensaoId}: mistura escalas impressas (${destinos.join(", ")}). Harmonização não definida.`
    );
  }
  return destinos[0]!;
}

/** @deprecated Use escalaDimensaoProduto. */
export function escalaFinalDimensao(dimensaoId: string): EscalaDimensaoProduto {
  return escalaDimensaoProduto(dimensaoId);
}
